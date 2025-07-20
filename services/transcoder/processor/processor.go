package processor

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"go.uber.org/zap"
)

// renditionSpec defines the parameters for each video rendition.
type renditionSpec struct {
	Name       string
	Scale      string
	CRF        string // AV1 Constant Quality (CQ) value. Used when -b:v is 0.
	Bitrate    string // Target bitrate for VBR mode.
	MaxBitrate string // Max bitrate for VBR mode.
	BufSize    string // Buffer size for VBR mode.
}

// renditions is a slice containing the specifications for the different output qualities.
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
) error {
	logger := zap.L().With(zap.String("videoId", request.VideoId))

	// --- Added Log ---
	// Confirm that the Process function has been entered.
	logger.Info("processor.Process function entered")

	originalKey := fmt.Sprintf("%s/%s", "originals", request.S3Key)
	keyFor := func(r renditionSpec) string {
		return fmt.Sprintf("%s/av1/%s/%s.mp4", transcodedPrefix, r.Name, request.VideoId)
	}
	manifestKey := fmt.Sprintf("%s/%s.m3u8", manifestPrefix, request.VideoId)

	logger.Info("start transcode",
		zap.String("bucket", bucketName),
		zap.String("originalKey", originalKey),
		zap.String("videoId", request.VideoId),
		zap.String("region", aws.StringValue(s3Client.Config.Region)),
	)

	// --- FIX: Download the source file to a temporary local file first. ---
	// This is more robust than streaming, as it allows ffmpeg to seek and correctly
	// handle files where metadata (like the 'moov' atom) is at the end.
	tempInputPath, _, err := downloadToTemp(ctx, s3Client, bucketName, originalKey, logger)
	if err != nil {
		// --- Enhanced Logging ---
		// Log the specific error before returning to make debugging clear.
		logger.Error("failed to download original file from S3", zap.Error(err), zap.String("s3Key", originalKey))
		return fmt.Errorf("failed to download original file: %w", err)
	}
	// Ensure the temporary file is deleted after the function completes.
	defer os.Remove(tempInputPath)

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10MB parts
		u.Concurrency = 5
	})

	// Transcode for each rendition using the downloaded local file.
	for _, r := range renditions {
		if err := transcodeOne(ctx, uploader, bucketName, tempInputPath, keyFor(r), r, logger); err != nil {
			return fmt.Errorf("rendition %s: %w", r.Name, err)
		}
	}

	// Build a simple manifest file (placeholder for HLS).
	// For a real HLS implementation, you would generate a proper manifest with EXT-X-STREAM-INF tags.
	endpoint := fmt.Sprintf("https://%s.s3.%s.amazonaws.com", bucketName, aws.StringValue(s3Client.Config.Region))
	manifest, err := buildManifest(endpoint, keyFor(renditions[0]), keyFor(renditions[1]), keyFor(renditions[2]))
	if err != nil {
		return fmt.Errorf("build manifest: %w", err)
	}

	// Upload the manifest to S3.
	if _, err := s3Client.PutObject(&s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(manifestKey),
		Body:        strings.NewReader(manifest),
		ContentType: aws.String("application/vnd.apple.mpegurl"),
	}); err != nil {
		return fmt.Errorf("upload manifest: %w", err)
	}
	logger.Info("manifest uploaded", zap.String("key", manifestKey))
	return nil
}

// transcodeOne handles the transcoding of a single rendition.
// It reads from a local file path and uploads the result to S3.
func transcodeOne(
	ctx context.Context,
	uploader *s3manager.Uploader,
	bucketName, tempInputPath, outKey string,
	r renditionSpec,
	logger *zap.Logger,
) error {
	log := logger.With(zap.String("rendition", r.Name))
	log.Info("transcoding start", zap.String("scale", r.Scale), zap.String("outKey", outKey))

	// Create a pipe to stream ffmpeg's output directly to the S3 uploader.
	// This avoids saving the transcoded file to disk.
	prOut, pwOut := io.Pipe()

	// Build the ffmpeg command arguments, passing the local input path.
	ffmpegArgs := buildFFmpegArgs(r, tempInputPath)
	log.Info("ffmpeg args", zap.Strings("args", ffmpegArgs))

	cmd := exec.CommandContext(ctx, "ffmpeg", ffmpegArgs...)
	cmd.Stdout = pwOut // Pipe ffmpeg's standard output to our pipe writer.
	cmd.Stdin = nil    // No standard input is needed as we provide a file path.

	// Capture stderr for debugging purposes.
	var stderrBuf bytes.Buffer
	cmd.Stderr = &stderrBuf

	// Start the S3 upload in a separate goroutine.
	// It will read from the pipe as ffmpeg writes to it.
	uploadErrCh := make(chan error, 1)
	go func() {
		defer close(uploadErrCh)
		log.Info("upload start", zap.String("bucket", bucketName), zap.String("key", outKey))
		_, upErr := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(outKey),
			Body:   prOut,
		})
		if upErr != nil {
			log.Error("upload failed", zap.Error(upErr))
		} else {
			log.Info("upload finished")
		}
		uploadErrCh <- upErr
	}()

	start := time.Now()
	log.Info("ffmpeg started")

	// Run ffmpeg and wait for it to complete.
	waitErr := cmd.Run()

	// After ffmpeg finishes (or fails), close the pipe writer.
	// This signals EOF to the pipe reader in the upload goroutine.
	pwOut.Close()

	if waitErr != nil {
		log.Error("ffmpeg failed",
			zap.Error(waitErr),
			zap.String("stderr", truncate(stderrBuf.String(), 8000)),
		)
		// If ffmpeg fails, the upload might still be running. Closing the reader
		// with an error will interrupt it.
		prOut.CloseWithError(waitErr)
		return fmt.Errorf("ffmpeg (%s): %w\nstderr:\n%s",
			r.Name, waitErr, stderrBuf.String())
	}

	// Wait for the upload to complete and check for any errors.
	upErr := <-uploadErrCh
	if upErr != nil {
		return fmt.Errorf("s3 upload: %w", upErr)
	}

	log.Info("rendition done",
		zap.Duration("elapsed", time.Since(start)),
	)
	return nil
}

// buildFFmpegArgs constructs the command-line arguments for ffmpeg.
func buildFFmpegArgs(r renditionSpec, inputPath string) []string {
	return []string{
		"-hide_banner",
		"-i", inputPath, // Use the local file path as input.
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
		"-f", "mp4",
		"pipe:1", // Output to standard output.
	}
}

// downloadToTemp downloads an object from S3 to a local temporary file.
func downloadToTemp(ctx context.Context, s3Client *s3.S3, bucket, key string, logger *zap.Logger) (string, int64, error) {
	out, err := s3Client.GetObjectWithContext(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return "", 0, fmt.Errorf("get object: %w", err)
	}
	defer out.Body.Close()

	// Create a temporary file to store the download.
	tmpFile, err := os.CreateTemp("", "vidsmith-original-*.mp4")
	if err != nil {
		return "", 0, fmt.Errorf("create temp file: %w", err)
	}
	defer tmpFile.Close()

	// Copy the S3 object body to the temporary file.
	written, copyErr := io.Copy(tmpFile, out.Body)
	if copyErr != nil {
		// Clean up the failed temp file before returning.
		os.Remove(tmpFile.Name())
		return "", 0, fmt.Errorf("copy to temp file: %w", copyErr)
	}

	logger.Info("downloaded original to temp file",
		zap.String("tmpPath", tmpFile.Name()),
		zap.Int64("bytes", written),
	)
	return tmpFile.Name(), written, nil
}

// truncate shortens a string to a maximum length for cleaner logging.
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "...[truncated]"
}

// buildManifest creates a very basic playlist file.
// NOTE: This is not a valid HLS manifest for adaptive bitrate streaming.
// A proper implementation would use #EXT-X-STREAM-INF tags.
func buildManifest(endpoint, key1080, key720, key480 string) (string, error) {
	var b strings.Builder
	b.WriteString("#EXTM3U\n")
	b.WriteString("#EXT-X-VERSION:3\n")
	// TODO: Replace with proper EXT-X-STREAM-INF entries for real HLS.
	b.WriteString("# This is a placeholder manifest.\n")
	b.WriteString(endpoint + "/" + key1080 + "\n")
	b.WriteString(endpoint + "/" + key720 + "\n")
	b.WriteString(endpoint + "/" + key480 + "\n")
	return b.String(), nil
}
