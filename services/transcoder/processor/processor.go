package processor

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/fsnotify/fsnotify"
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
	{Name: "1080p", Scale: "1920x1080", CRF: "32", Bitrate: "4000k", MaxBitrate: "5000k", BufSize: "8000k"},
	{Name: "720p", Scale: "1280x720", CRF: "34", Bitrate: "2500k", MaxBitrate: "3200k", BufSize: "5000k"},
	{Name: "480p", Scale: "854x480", CRF: "36", Bitrate: "1200k", MaxBitrate: "1800k", BufSize: "3600k"},
}

// Process handles the entire transcoding workflow for a video request.
func Process(
	ctx context.Context,
	request types.TranscodeRequest,
	bucketName, transcodedPrefix, manifestPrefix string,
	s3Client *s3.S3,
	sess *session.Session,
	logger *zap.Logger,
) error {
	// Confirm that the Process function has been entered.
	logger.Info("processor.Process function entered")
	
	keyFor := func(r renditionSpec) string {
		return fmt.Sprintf("%s/av1/%s/%s.mp4", transcodedPrefix, r.Name, request.VideoId)
	}

	originalKey := fmt.Sprintf("%s/%s", "originals", request.S3Key)

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10MB parts
		u.Concurrency = 5
	})

	stagingDir, err := os.MkdirTemp("", "transcoder-"+ request.VideoId)
	if err != nil {
		return fmt.Errorf("create staging directory: %w", err)
	}
	defer os.RemoveAll(stagingDir)

	// Transcode for each rendition using the downloaded local file.
	for _, r := range renditions {
		if err := transcodeOneRendition(ctx, uploader, s3Client, bucketName, originalKey, keyFor(r), stagingDir, r, logger); err != nil {
			return fmt.Errorf("rendition %s: %w", r.Name, err)
		}
	}

	return nil
}

func transcodeOneRendition(
	ctx context.Context,
	uploader *s3manager.Uploader,
	s3Client *s3.S3,
	bucketName, originalKey, outKey, stagingDir string,
	r renditionSpec,
	logger *zap.Logger,
) error {
	log := logger.With(zap.String("rendition", r.Name))

	reditionDirKey := fmt.Sprintf("%s/%s", stagingDir, r.Name)
	if err := os.MkdirAll(reditionDirKey, 0755); err != nil {
		return fmt.Errorf("create rendition directory: %w", err)
	}

	watcherErrCh := make(chan error, 1)
	uploadErrCh := make(chan error, 1)
	cancelCtx, cancel := context.WithCancel(context.Background())
	go watchAndUpload(cancelCtx, uploader, bucketName, outKey, stagingDir, r, log, watcherErrCh, uploadErrCh)

	// pipe to stream s3 object to ffmpeg
	prIn, pwIn := io.Pipe()

	downloadErrCh := make(chan error, 1)
	copyErrCh := make(chan error, 1)
	
	go func() {
		defer pwIn.Close()
		streamS3Object(ctx, s3Client, bucketName, originalKey, pwIn, downloadErrCh, copyErrCh, log)
	}()

	ffmpegArgs := buildFFmpegArgs(r, reditionDirKey)

	ffmpegCommand := exec.CommandContext(ctx, "ffmpeg", ffmpegArgs...) // prepares an external command to run by the system
	ffmpegCommand.Stdin = prIn

	// Capture stderr for debugging purposes.
	var stderrBuf bytes.Buffer
	ffmpegCommand.Stderr = &stderrBuf

	start := time.Now()
	log.Info("ffmpeg started")

	ffmpegError := ffmpegCommand.Run()

	cancel()

	if ffmpegError != nil {
		log.Error("ffmpeg failed", zap.Error(ffmpegError), zap.String("stderr", stderrBuf.String()))
		return fmt.Errorf("ffmpeg (%s): %w\nstderr:\n%s", r.Name, ffmpegError, stderrBuf.String())
	}

	// Wait for the upload to complete and check for any errors.
	upErr := <-uploadErrCh
	downErr := <-downloadErrCh

	if downErr != nil {
		return fmt.Errorf("s3 download: %w", downErr)
	}

	if upErr != nil {
		return fmt.Errorf("s3 upload: %w", upErr)
	}

	log.Info("rendition done",
		zap.Duration("elapsed", time.Since(start)),
	)
	return nil
}

func streamS3Object(ctx context.Context, s3Client *s3.S3, bucketName, originalKey string, pwIn *io.PipeWriter, downloadErrCh chan error, copyErrCh chan error, logger *zap.Logger) {
	logger.Info("download start", zap.String("bucket", bucketName), zap.String("key", originalKey))
	
	// Get object from S3 and stream to pipe
	result, downErr := s3Client.GetObjectWithContext(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(originalKey),
	})

	downloadErrCh <- downErr
	
	defer result.Body.Close()
	_, copyErr := io.Copy(pwIn, result.Body)

	copyErrCh <- copyErr

	pwIn.Close()

	logger.Info("download finished")
}

func buildFFmpegArgs(r renditionSpec, outDir string) []string {
	hlsSegmentFilename := filepath.Join(outDir, "%d.m4s")
    hlsPlaylistName := filepath.Join(outDir, "playlist.m3u8")	
	
	return []string{
		"-hide_banner",
		"-i", "-", // use stdin as input
		"-map", "0:v:0", // Map the first video stream.
		"-map", "0:a:0?", // Map the first audio stream, if it exists.
		"-vf", "scale=" + r.Scale,
		"-c:v", "libaom-av1", // Use the AV1 video codec.
		"-pix_fmt", "yuv420p",
		"-cpu-used", "6", // Encoding speed/quality trade-off (0-8, higher is faster).
		"-row-mt", "1", // Enable row-based multithreading.

		// --- Constant Quality (CRF) Mode ---
		// This is generally preferred for quality and efficiency.
		"-crf", r.CRF,
		"-b:v", "0", // Required for CRF mode.

		// --- Audio settings ---
		"-c:a", "aac",
		"-b:a", "128k",

		// --- Output container settings ---
		"-movflags", "frag_keyframe+empty_moov", // Optimize for streaming.
		"-f", "hls",
		"-hls_time", "4",
        "-hls_playlist_type", "vod", "-hls_segment_type", "fmp4",

        "-hls_segment_filename", hlsSegmentFilename,
        hlsPlaylistName,
	}
}

func watchAndUpload(ctx context.Context, 
	uploader *s3manager.Uploader, 
	bucketName, outKey, stagingDir string, 
	r renditionSpec, 
	logger *zap.Logger, 
	errCh chan error,
	uploadErrCh chan error,
	) {
	
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		errCh <- fmt.Errorf("create watcher: %w", err)
		return
	}
	defer watcher.Close()

	if err := watcher.Add(stagingDir); err != nil {
		errCh <- fmt.Errorf("add watcher: %w", err)
		return
	}

	for {
		select {
			case event, ok := <-watcher.Events:{
				if !ok {return}
				if event.Op&fsnotify.Write == fsnotify.Write {
					segmentName := filepath.Base(event.Name)
					if strings.HasSuffix(event.Name, ".m3u8") {
						continue
					}
					logger.Info("file written", zap.String("file", event.Name))
					go uploadSegment(ctx, event.Name, outKey, segmentName, uploader, bucketName, r, logger, uploadErrCh)
				}
			}
			case err, ok := <-watcher.Errors:{
				if !ok {
					errCh <- fmt.Errorf("watcher error: %w", err)
					return
				}
				logger.Error("watcher error", zap.Error(err))
			}
			case <-ctx.Done():{
				return
			}
		}
	}
}

func uploadSegment(ctx context.Context, filePath, outKey, segName string, uploader *s3manager.Uploader, bucketName string, r renditionSpec, logger *zap.Logger, uploadErrCh chan error) {
	// Try to open file with exclusive lock, retry up to 50 times
	var file *os.File
	var err error
	for i := 0; i < 50; i++ {
		file, err = os.OpenFile(filePath, os.O_RDONLY|os.O_EXCL, 0)
		if err == nil {
			break // File is ready to read
		}
		// File is still being written, wait and retry
		time.Sleep(1000 * time.Millisecond)
	}
	
	if err != nil {
		uploadErrCh <- fmt.Errorf("failed to open segment for upload: %w", err)
		return
	}

	s3Key := fmt.Sprintf("%s/%s/%s", outKey, r.Name, segName)
	defer file.Close()
	_, err = uploader.UploadWithContext(ctx, &s3manager.UploadInput{
		Bucket: aws.String(bucketName), 
		Key: aws.String(s3Key), 
		Body: file,
	})
	if err != nil {
		uploadErrCh <- fmt.Errorf("failed to upload segment: %w", err)
		return
	}
	logger.Info("Uploaded segment", zap.String("segment", segName))
	os.Remove(filePath)
}