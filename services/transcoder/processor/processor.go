package processor

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"mime"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

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

	reditionDirKey := filepath.Join(stagingBase, r.Name)
	if err := os.MkdirAll(reditionDirKey, 0755); err != nil {
		return fmt.Errorf("create rendition directory: %w", err)
	}

	defer os.RemoveAll(reditionDirKey)

	prList, pwList := io.Pipe()

	ffmpegCommand := exec.CommandContext(ctx, "ffmpeg", argBuilder(r, reditionDirKey, localVideoPath)...)
	ffmpegCommand.Stdout = pwList

	var stderrBuf bytes.Buffer
	ffmpegCommand.Stderr = &stderrBuf

	if err := ffmpegCommand.Start(); err != nil {
		return fmt.Errorf("ffmpeg (%s): %w", r.Name, err)
	}

	var wg sync.WaitGroup
	scanner := bufio.NewScanner(prList)

	go detectNewChunk(scanner, &wg, transcodedPrefix, videoID, r.Name, reditionDirKey, log, uploader, bucket, ctx)

	if err := ffmpegCommand.Wait(); err != nil {
		return fmt.Errorf("ffmpeg (%s) failed: %w\n%s", r.Name, err, stderrBuf.String())
	}

	pwList.Close()
	wg.Wait()

	log.Info("rendition complete")

	return nil
}

func detectNewChunk(
	scanner *bufio.Scanner, 
	wg *sync.WaitGroup, 
	transcodedPrefix, videoID, renditionName, renditionDir string,
	log *zap.Logger,
	uploader *s3manager.Uploader,
	bucket string,
	ctx context.Context,
) {
	for scanner.Scan() {
		fileName := scanner.Text() // FFmpeg outputs just the filename
		fullPath := filepath.Join(renditionDir, fileName)
		s3Key := filepath.Join(transcodedPrefix, videoID, renditionName, fileName)
		
		wg.Add(1)
		go uploadChunk(uploader, bucket, s3Key, fullPath, log, wg, ctx)
	}
	if err := scanner.Err(); err != nil {
		log.Error("scan failed", zap.Error(err))
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
	if ct == "" {
		ct = "video/iso.segment"
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

        // video encode
        "-c:v", "libx264", "-preset", "medium", "-crf", r.CRF, "-b:v", "0",
        // align keyframes to 4s segments
        "-sc_threshold", "0",
        "-force_key_frames", "expr:gte(t,n_forced*4)",

        // audio encode
        "-c:a", "aac", "-b:a", "128k",

        // DASH muxer (NOT the segment muxer)
        "-f", "dash",
        "-seg_duration", "4",
        "-use_template", "1",
        "-use_timeline", "0",
        "-init_seg_name", "init.mp4",
        "-media_seg_name", "chunk-$Number%03d$.m4s",
        "-single_file", "0",
        "-remove_at_exit", "0",

        // output MPD path (segments land in segDir)
        filepath.Join(segDir, "ignored.mpd"),
    }
}

