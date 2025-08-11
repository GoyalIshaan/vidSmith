package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"go.uber.org/zap"
)

// defines the parameters for each video rendition.
type renditionSpec struct {
	Name       string
	Scale      string
	CRF        string // tells ffmpeg to aim for a certain visual quality level
	MaxBitrate string
	BufSize    string
	Bandwidth  int
}

var renditions = []renditionSpec{
	{Name: "1080p", Scale: "1920x1080", CRF: "32", MaxBitrate: "5000k", BufSize: "10000k", Bandwidth: 5000000},
	{Name: "720p", Scale: "1280x720", CRF: "34", MaxBitrate: "3000k", BufSize: "6000k", Bandwidth: 3000000},
	{Name: "480p", Scale: "854x480", CRF: "36", MaxBitrate: "1200k", BufSize: "2400k", Bandwidth: 1200000},
}


func downloadVideoFromS3(
	ctx context.Context,
	downloader *s3manager.Downloader,
	bucket, key, localPath string,
	logger *zap.Logger,
) error {
	logger.Info("downloading video from S3", zap.String("key", key), zap.String("localPath", localPath))

	file, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("create local file: %w", err)
	}
	defer file.Close()

	_, err = downloader.DownloadWithContext(ctx, file, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(d *s3manager.Downloader) {
		d.Concurrency = 10
		d.PartSize = 10 * 1024 * 1024 // 10MB parts
	})
	
	if err != nil {
		return fmt.Errorf("get object from S3: %w", err)
	}

	logger.Info("video downloaded successfully", zap.String("localPath", localPath))
	return nil
}

// Process handles the entire transcoding workflow for a video request.
func Process(
	ctx context.Context,
	request types.TranscodeRequest,
	bucketName, transcodedPrefix string,
	s3Client *s3.S3,
	sess *session.Session,
	logger *zap.Logger,
) (types.UpdateVideoStatusEvent, error) {
	// Confirm that the Process function has been entered.
	logger.Info("processor.Process function entered")

	stagingDir, err := os.MkdirTemp("", "transcoder-"+ request.VideoId)
	if err != nil {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("create staging directory: %w", err)
	}
	
	defer os.RemoveAll(stagingDir)
	
	originalKey := fmt.Sprintf("%s/%s", "originals", request.S3Key)
	thumbnailKey := path.Join(transcodedPrefix, request.VideoId, "thumbnails", "poster.jpg")

	downloader := s3manager.NewDownloader(sess)

	localVideoPath := filepath.Join(stagingDir, "original_video")
	if err := downloadVideoFromS3(ctx, downloader, bucketName, originalKey, localVideoPath, logger); err != nil {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("download video from S3: %w", err)
	}
	
	defer func() {
		if err := os.Remove(localVideoPath); err != nil && !os.IsNotExist(err) {
			logger.Warn("failed to remove local video file", zap.String("path", localVideoPath), zap.Error(err))
		}
	}()

	duration, err := getVideoDuration(ctx, localVideoPath)
	if err != nil {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("get video duration: %w", err)
	}

	logger.Info("video duration", zap.Float64("duration", duration))

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10MB parts
		u.Concurrency = 5
	})

	
	thumbnailErrChan := make(chan error)
	go func() {
		thumbnailErrChan <- generateThumbnail(ctx, uploader, bucketName, stagingDir, thumbnailKey, localVideoPath, duration, logger)
	}()

	var failedRenditions []renditionSpec
	var successRenditions []renditionSpec
	for _, r := range renditions {
		if err := processSingleRendition(ctx, uploader, bucketName, localVideoPath, transcodedPrefix, request.VideoId, r, stagingDir, logger); err != nil {
			logger.Error("rendition failed, continuing with others", zap.String("rendition", r.Name), zap.Error(err))
			failedRenditions = append(failedRenditions, r)
			continue
		}
		logger.Info("rendition completed successfully", zap.String("rendition", r.Name))
		successRenditions = append(successRenditions, r)
	}
	
	if len(failedRenditions) == len(renditions) {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("all renditions failed: %v", failedRenditions)
	}
	

	masterPlaylistPath := filepath.Join(stagingDir, "master.m3u8")
	if err := writeMasterPlaylist(masterPlaylistPath, successRenditions); err != nil {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("write master playlist: %w", err)
	}

	masterS3Key := path.Join(transcodedPrefix, request.VideoId, "master.m3u8")
	cacheControl := "public, max-age=31536000"
	
	if err := uploadFile(ctx, uploader, bucketName, masterS3Key, masterPlaylistPath, cacheControl, logger); err != nil {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("upload master playlist: %w", err)
	}

	if err := <-thumbnailErrChan; err != nil {
		return types.UpdateVideoStatusEvent{}, fmt.Errorf("generate thumbnail: %w", err)
	}

	videoStatusEvent := types.UpdateVideoStatusEvent{
		VideoId: request.VideoId,
		Phase: "transcode",
		MasterManifest: masterS3Key,
		ThumbnailLink: thumbnailKey,
		VideoDuration: duration,
	}

	return videoStatusEvent, nil
}

func processSingleRendition(
	ctx context.Context,
	uploader *s3manager.Uploader,
	bucket, localVideoPath, transcodedPrefix, videoID string,
	r renditionSpec,
	stagingBase string,
	logger *zap.Logger,
) error {
	log := logger.With(zap.String("rendition", r.Name))

	renditionDir := filepath.Join(stagingBase, r.Name)
	if err := os.MkdirAll(renditionDir, 0755); err != nil {
		return fmt.Errorf("create rendition directory: %w", err)
	}

	cmd := exec.CommandContext(ctx, "ffmpeg", argBuilder(r, localVideoPath)...)
	cmd.Dir=renditionDir

	var stderrBuf bytes.Buffer
	cmd.Stderr = &stderrBuf

	// Start uploader watcher BEFORE starting ffmpeg
	var wg sync.WaitGroup
	stop := make(chan struct{})
	wg.Add(1)
	go watchAndUploadSegments(
		ctx, &wg, stop, uploader, bucket,
		transcodedPrefix, videoID, r.Name, renditionDir, log,
	)

	if err := cmd.Start(); err != nil {
		close(stop)
		wg.Wait()
		return fmt.Errorf("ffmpeg (%s): %w", r.Name, err)
	}

	if err := cmd.Wait(); err != nil {
		close(stop)
		wg.Wait()
		return fmt.Errorf("ffmpeg (%s) failed: %w\n%s", r.Name, err, stderrBuf.String())
	}

	// Signal watcher to do a final sweep and exit
	close(stop)
	wg.Wait()

	indexPath := filepath.Join(renditionDir, "index.m3u8")
	if _, err := os.Stat(indexPath); err == nil {
		key := path.Join(transcodedPrefix, videoID, r.Name, "index.m3u8")
		if err := uploadFile(ctx, uploader, bucket, key, indexPath, "public, max-age=31536000", log); err != nil {
			log.Warn("final index.m3u8 upload failed", zap.Error(err))
		}
	}

	initPath := filepath.Join(renditionDir, "init.mp4")
	if _, err := os.Stat(initPath); err == nil {
		key := path.Join(transcodedPrefix, videoID, r.Name, "init.mp4")
		if err := uploadFile(ctx, uploader, bucket, key, initPath, "public, max-age=31536000, immutable", log); err != nil {
			log.Warn("final init.mp4 upload failed", zap.Error(err))
		}
	}

	log.Info("rendition complete")
	return nil
}


func watchAndUploadSegments(
	ctx context.Context,
	wg *sync.WaitGroup,
	stop <-chan struct{},
	uploader *s3manager.Uploader,
	bucket, transcodedPrefix, videoID, renditionName, dir string,
	log *zap.Logger,
) {
	defer wg.Done()

	uploaded := make(map[string]struct{})

	ticker := time.NewTicker(300 * time.Millisecond)
	defer ticker.Stop()

	upload := func(name string) {
		if !(strings.HasSuffix(name, ".m4s")) {
			return
		}
		if _, ok := uploaded[name]; ok {
			return
		}

		localPath := filepath.Join(dir, name)
		
		s3Key := path.Join(transcodedPrefix, videoID, renditionName, name)

		cacheControl := "public, max-age=31536000, immutable"
		
		if err := uploadFile(ctx, uploader, bucket, s3Key, localPath, cacheControl, log); err != nil {
			log.Warn("upload failed", zap.Error(err))
		} else {
			uploaded[name] = struct{}{}
		}
	}

	scan := func() {
		entries, err := os.ReadDir(dir)
		if err != nil {
			log.Warn("scan dir failed", zap.Error(err))
			return
		}
		for _, dirEntry := range entries {
			if dirEntry.IsDir() { continue }
			upload(dirEntry.Name())
		}
	}

	for {
		select {
		case <-stop:
			// final flush
			for i := 0; i < 6; i++ { // ~1.8s of final settling
				scan()
				time.Sleep(300 * time.Millisecond)
			}
			return
		case <-ticker.C:
			scan()
		}
	}
}


func argBuilder(r renditionSpec, inputVideoPath string) []string {
    playlistPath := "index.m3u8"

    return []string{
        "-hide_banner", "-loglevel", "warning",
        "-i", inputVideoPath,

        // Map video + optional audio
        "-map", "0:v:0",
        "-map", "0:a:0?",

        // Scaling
        "-vf", "scale=" + r.Scale,

        // Video encoding (H.264) tuned for streaming
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", r.CRF,
        "-maxrate", r.MaxBitrate,
        "-bufsize", r.BufSize,
        "-pix_fmt", "yuv420p",

        // Keyframe alignment for 4s segments
        "-sc_threshold", "0",
        "-force_key_frames", "expr:gte(t,n_forced*4)",

        // Audio encoding (AAC-LC stereo)
        "-c:a", "aac",
        "-profile:a", "aac_low",
        "-b:a", "128k",
        "-ac", "2",
        "-ar", "48000",

        // --- HLS (CMAF/fMP4) output ---
        "-f", "hls",
        "-hls_playlist_type", "vod",              // Finalized playlist with #EXT-X-ENDLIST
        "-hls_time", "4",                         // 4s segments
        "-hls_flags", "independent_segments+temp_file",     // IDR frame at segment start
        "-hls_segment_type", "fmp4",              // Fragmented MP4 (CMAF)
        "-hls_fmp4_init_filename", "init.mp4",    // Will be in same folder as playlist
        "-hls_segment_filename", "chunk_%05d.m4s",// Relative paths in playlist
        "-hls_list_size", "0",                    // Keep all segments in VOD
        playlistPath,                             // Output media playlist
    }
}

func contentTypeFor(p string) string {
	ext := strings.ToLower(filepath.Ext(p))
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".m4s":
		return "video/iso.segment"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		return "video/mp4"
	case ".mpd":
		return "application/dash+xml"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".webp":
		return "image/webp"
	case ".png":
		return "image/png"
	case ".vtt":
		return "text/vtt"

	default:
		return "application/octet-stream"
	}
}

func uploadFile(
	ctx context.Context,
	uploader *s3manager.Uploader,
	bucket, key, localPath, cacheControl string,
	log *zap.Logger,
) error {
	f, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("open %s: %w", localPath, err)
	}
	defer f.Close()

	ct := contentTypeFor(localPath)

	_, err = uploader.UploadWithContext(ctx, &s3manager.UploadInput{
		Bucket:       aws.String(bucket),
		Key:          aws.String(key),
		Body:         f,
		ContentType:  aws.String(ct),
		CacheControl: aws.String(cacheControl),
	})
	if err != nil {
		return fmt.Errorf("upload %s: %w", key, err)
	}

	_ = os.Remove(localPath)
	log.Info("uploaded", zap.String("key", key))
	return nil
}

func writeMasterPlaylist(dst string, items []renditionSpec) error {
	var b strings.Builder
	b.WriteString("#EXTM3U\n")
	b.WriteString("#EXT-X-VERSION:7\n")
	b.WriteString("#EXT-X-INDEPENDENT-SEGMENTS\n")
	for _, it := range items {
		// RESOLUTION from Scale (e.g., 1280x720)
		res := it.Scale
		// AVERAGE-BANDWIDTH ~ 85% of peak as a heuristic
		avg := int(float64(it.Bandwidth) * 0.85)
		// CODECS are reasonably generic for H.264 + AAC LC
		fmt.Fprintf(&b, "#EXT-X-STREAM-INF:BANDWIDTH=%d,AVERAGE-BANDWIDTH=%d,RESOLUTION=%s,CODECS=\"avc1.42E01E,mp4a.40.2\"\n", it.Bandwidth, avg, res)
		fmt.Fprintf(&b, "%s/index.m3u8\n", it.Name)
	}
	return os.WriteFile(dst, []byte(b.String()), 0644)
}

func generateThumbnail(ctx context.Context, uploader *s3manager.Uploader, bucket, stagingDir, s3Key, videoPath string, duration float64, logger *zap.Logger) error {
    thumbDir := filepath.Join(stagingDir, "thumbnails")
    if err := os.MkdirAll(thumbDir, 0755); err != nil {
        return err
    }

	seekTime := duration * 0.25
	seekTimeStr := fmt.Sprintf("%.1f", seekTime) // the .1f here means 1 decimal place

    poster := filepath.Join(thumbDir, "poster.jpg")
    cmd := exec.CommandContext(ctx, "ffmpeg", "-y", "-ss", seekTimeStr, "-i", videoPath,
        "-frames:v", "1",
        "-vf", "scale=1280:-1:force_original_aspect_ratio=decrease",
        "-q:v", "2", poster)
    cmd.Stderr = os.Stderr

    if err := cmd.Run(); err != nil {
        logger.Warn("poster generation failed", zap.Error(err))
        return err
    }

    
    if err := uploadFile(ctx, uploader, bucket, s3Key, poster, "public, max-age=31536000, immutable", logger); err != nil {
        logger.Warn("poster upload failed", zap.Error(err))
        return err
    }

    return nil
}

func getVideoDuration(ctx context.Context, videoPath string) (float64, error) {
    // ffprobe command to output JSON with just the duration
    cmd := exec.CommandContext(ctx, "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        videoPath,
    )

    var out bytes.Buffer
    cmd.Stdout = &out

    if err := cmd.Run(); err != nil {
        return 0, err
    }

    // Parse JSON
    var probe struct {
        Format struct {
            Duration string `json:"duration"`
        } `json:"format"`
    }

    if err := json.Unmarshal(out.Bytes(), &probe); err != nil {
        return 0, err
    }

    dur, err := strconv.ParseFloat(probe.Format.Duration, 64)
    if err != nil {
        return 0, err
    }

    return dur, nil
}