package processor

import (
	"bytes"
	"context"
	"fmt"
	"mime"
	"os"
	"os/exec"
	"path"
	"path/filepath"
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
	Bitrate    string
	MaxBitrate string
	BufSize    string
}

var renditions = []renditionSpec{
	{Name: "1080p", Scale: "1920x1080", CRF: "32"},
	{Name: "720p", Scale: "1280x720", CRF: "34"},
	{Name: "480p", Scale: "854x480", CRF: "36"},
}

// getBitrateForRendition returns appropriate max bitrate for each rendition
func getBitrateForRendition(name string) string {
	switch name {
	case "1080p":
		return "5000k"
	case "720p":
		return "3000k"
	case "480p":
		return "1200k"
	default:
		return "2000k"
	}
}

// getBufSizeForRendition returns appropriate buffer size for each rendition
func getBufSizeForRendition(name string) string {
	switch name {
	case "1080p":
		return "10000k"
	case "720p":
		return "6000k"
	case "480p":
		return "2400k"
	default:
		return "4000k"
	}
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
) error {
	// Confirm that the Process function has been entered.
	logger.Info("processor.Process function entered")

	stagingDir, err := os.MkdirTemp("", "transcoder-"+ request.VideoId)
	if err != nil {
		return fmt.Errorf("create staging directory: %w", err)
	}
	
	defer os.RemoveAll(stagingDir)
	
	originalKey := fmt.Sprintf("%s/%s", "originals", request.S3Key)

	downloader := s3manager.NewDownloader(sess)

	localVideoPath := filepath.Join(stagingDir, "original_video")
	if err := downloadVideoFromS3(ctx, downloader, bucketName, originalKey, localVideoPath, logger); err != nil {
		return fmt.Errorf("download video from S3: %w", err)
	}
	
	defer func() {
		if err := os.Remove(localVideoPath); err != nil && !os.IsNotExist(err) {
			logger.Warn("failed to remove local video file", zap.String("path", localVideoPath), zap.Error(err))
		}
	}()

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10MB parts
		u.Concurrency = 5
	})

	for _, r := range renditions {
		if err := processSingleRendition(ctx, uploader, bucketName, localVideoPath, transcodedPrefix, request.VideoId, r, stagingDir, logger); err != nil {
			return fmt.Errorf("rendition %s: %w", r.Name, err)
		}
	}

	return nil
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
	defer os.RemoveAll(renditionDir)

	cmd := exec.CommandContext(ctx, "ffmpeg", argBuilder(r, renditionDir, localVideoPath)...)

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


	t := time.NewTicker(300 * time.Millisecond)
	defer t.Stop()

	uploadIfReady := func(name string) {
		// Only care about init.mp4 and *.m4s, ignore manifest.mpd
		if !(name == "init.mp4" || strings.HasSuffix(name, ".m4s")) {
			return
		}
		pathFS := filepath.Join(dir, name)
		
		s3Key := path.Join(transcodedPrefix, videoID, renditionName, name)
		var upWG sync.WaitGroup
		upWG.Add(1)
		go uploadChunk(uploader, bucket, s3Key, pathFS, log, &upWG, ctx)
		upWG.Wait() // ensure removal before next tick
	
	}

	scan := func() {
		entries, err := os.ReadDir(dir)
		if err != nil {
			log.Warn("scan dir failed", zap.Error(err))
			return
		}
		for _, e := range entries {
			if e.IsDir() { continue }
			// Ignore the HLS playlist
			if e.Name() == "ignored.m3u8" { continue }
			uploadIfReady(e.Name())
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
		case <-t.C:
			scan()
		}
	}
}


func uploadChunk(
	uploader *s3manager.Uploader,
	bucket, s3Key, path string,
	log *zap.Logger,
	wg *sync.WaitGroup,
	ctx context.Context,
) {
	defer wg.Done()

	file, err := os.Open(path)
	if err != nil {
		log.Error("open failed", zap.String("path", path), zap.Error(err))
		return
	}
	defer file.Close()

	ct := mime.TypeByExtension(filepath.Ext(path))

	if strings.HasSuffix(path, ".mp4") {
		ct = "video/mp4"
	}
	if strings.HasSuffix(path, ".m4s") {
        ct = "video/mp4"
    }
    if ct == "" {
        ct = "application/octet-stream"
    }

	if _, err := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
		Bucket: aws.String(bucket),
		Key: aws.String(s3Key),
		Body: file,
		ContentType: aws.String(ct),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	}); err!= nil {
		log.Error("upload failed", zap.String("key", s3Key), zap.Error(err))
		return
	}

	os.Remove(path)
	log.Info("uploaded", zap.String("key", s3Key))
}

func argBuilder(r renditionSpec, segDir, inputVideoPath string) []string {
    return []string{
        "-hide_banner", "-loglevel", "warning",
        "-i", inputVideoPath,

        // streams
        "-map", "0:v:0",
        "-map", "0:a:0?",

        // scale
        "-vf", "scale=" + r.Scale,

        // video encode with explicit bitrate for DASH compatibility
        "-c:v", "libx264", "-preset", "medium", "-crf", r.CRF, 
        "-maxrate", getBitrateForRendition(r.Name), "-bufsize", getBufSizeForRendition(r.Name),
        // Force pixel format for browser compatibility
        "-pix_fmt", "yuv420p",
        // align keyframes to 4s segments
        "-sc_threshold", "0", 
        "-force_key_frames", "expr:gte(t,n_forced*4)",

        // audio encode - ensure stereo for compatibility
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",

        // Use fragmented MP4 with HLS muxer (more reliable than DASH muxer)
        "-f", "hls",
        "-hls_segment_type", "fmp4",
        "-hls_time", "4",
        "-hls_flags", "independent_segments+single_file", 
        "-hls_segment_filename", filepath.Join(segDir, "chunk-%05d.m4s"),
        "-hls_fmp4_init_filename", "init.mp4",

        // output playlist (will be ignored, we only want the segments)
        filepath.Join(segDir, "ignored.m3u8"),
    }
}

