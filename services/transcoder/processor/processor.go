package processor

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"go.uber.org/zap"
)

func Process(context context.Context, request types.TranscodeRequest, bucketName, transcodedPrefix, manifestPrefix string, s3Client *s3.S3, session *session.Session) error {
	logger := zap.L().With(zap.String("videoId", request.VideoId));

	// building the S3 keys
	originalKey := fmt.Sprintf("%s/%s", "originals", request.S3Key)
	key1080 := fmt.Sprintf("%s/av1/1080p/%s.mp4", transcodedPrefix, request.VideoId)
	key720  := fmt.Sprintf("%s/av1/720p/%s.mp4", transcodedPrefix, request.VideoId)
	key480  := fmt.Sprintf("%s/av1/480p/%s.mp4", transcodedPrefix, request.VideoId)
	manifestKey := fmt.Sprintf("%s/%s.m3u8", manifestPrefix, request.VideoId)

	// DEBUG: Log all S3 paths and request details
	logger.Info("DEBUG: Starting transcode process", 
		zap.String("bucketName", bucketName),
		zap.String("originalKey", originalKey),
		zap.String("requestS3Key", request.S3Key),
		zap.String("videoId", request.VideoId),
		zap.String("region", *s3Client.Config.Region),
	)

	// helper to transcode one resolution
	transcoder := func(resolution string, key string, scale string) error {
		logger.Info("transcoding video", zap.String("resolution", resolution));

		// DEBUG: Log S3 GetObject attempt
		logger.Info("DEBUG: Attempting to get S3 object", 
			zap.String("bucket", bucketName),
			zap.String("key", originalKey),
		)

		// stream original video from S3
		originalVideo, err := s3Client.GetObject(&s3.GetObjectInput{
			Bucket: &bucketName,
			Key: &originalKey,
		})

		if err != nil {
			logger.Error("DEBUG: S3 GetObject failed", 
				zap.String("bucket", bucketName),
				zap.String("key", originalKey),
				zap.Error(err),
			)
			return fmt.Errorf("failed to get original video: %w", err)
		}

		// DEBUG: Log successful S3 retrieval
		logger.Info("DEBUG: S3 GetObject successful", 
			zap.String("bucket", bucketName),
			zap.String("key", originalKey),
			zap.Int64("contentLength", *originalVideo.ContentLength),
			zap.String("contentType", *originalVideo.ContentType),
			zap.String("etag", *originalVideo.ETag),
		)

		// so that the io.ReadCloser is closed when the function returns
		defer originalVideo.Body.Close();

		// DEBUG: Check if video content is empty or too small
		if *originalVideo.ContentLength < 1024 { // Less than 1KB
			logger.Error("DEBUG: Video file too small, likely empty or invalid", 
				zap.Int64("contentLength", *originalVideo.ContentLength),
			)
			return fmt.Errorf("video file too small (%d bytes), likely empty or invalid", *originalVideo.ContentLength)
		}

		// pipe into FFmpeg stdin
		prIn, pwIn := io.Pipe();
		go func() {
			defer pwIn.Close();
			bytesCopied, err := io.Copy(pwIn, originalVideo.Body);
			logger.Info("DEBUG: Finished copying video data to FFmpeg", 
				zap.Int64("bytesCopied", bytesCopied),
				zap.Error(err),
			)
		}();

		// DEBUG: Log FFmpeg command
		ffmpegArgs := []string{
			"-i", "pipe:0",
			"-vf", "scale="+scale,
			"-c:v", "libaom-av1",
			"-f", "mp4", "-movflags", "frag_keyframe+empty_moov",
			"pipe:1",
		}
		logger.Info("DEBUG: FFmpeg command", 
			zap.Strings("args", ffmpegArgs),
			zap.String("resolution", resolution),
		)

		// FFmpeg command
    	//    -i pipe:0         (read from stdin)
    	//    -vf scale=WxH     (scale filter)
    	//    -c:v libaom-av1   (AV1 codec)
    	//    -f mp4 -movflags frag_keyframe+empty_moov pipe:1
		cmd := exec.CommandContext(context, "ffmpeg", ffmpegArgs...)
		
		cmd.Stdin = prIn;

		// pipe into FFmpeg stdout
		prOut, pwOut := io.Pipe();
		cmd.Stdout = pwOut;

		// DEBUG: Capture FFmpeg stderr for error messages
		var ffmpegErr strings.Builder
		cmd.Stderr = &ffmpegErr

		// Start FFmpeg
		if err := cmd.Start(); err != nil {
			pwOut.Close();
			logger.Error("DEBUG: Failed to start FFmpeg", zap.Error(err))
			return fmt.Errorf("failed to start FFmpeg: %w", err);
		}

		logger.Info("DEBUG: FFmpeg started successfully", zap.String("resolution", resolution))

		uploader := s3manager.NewUploader(session, func (u *s3manager.Uploader) {
			u.PartSize = 5 * 1024 * 1024;
			u.Concurrency = 5
		})

		uploadErrCh := make(chan error, 1)

		go func() {
			defer pwOut.Close()
			logger.Info("DEBUG: Starting S3 upload", 
				zap.String("bucket", bucketName),
				zap.String("key", key),
				zap.String("resolution", resolution),
			)
			_, err := uploader.Upload(&s3manager.UploadInput{
				Bucket: aws.String(bucketName),
				Key:    aws.String(key),
				Body:   prOut,
			})
			if err != nil {
				logger.Error("DEBUG: S3 upload failed", 
					zap.String("bucket", bucketName),
					zap.String("key", key),
					zap.Error(err),
				)
			} else {
				logger.Info("DEBUG: S3 upload completed", 
					zap.String("bucket", bucketName),
					zap.String("key", key),
				)
			}
			uploadErrCh <- err
		}()

		if err := cmd.Wait(); err != nil {
			logger.Error("DEBUG: FFmpeg failed", 
				zap.String("resolution", resolution),
				zap.Error(err),
				zap.String("ffmpegStderr", ffmpegErr.String()),
			)
			return fmt.Errorf("ffmpeg wait [%s]: %w (stderr: %s)", resolution, err, ffmpegErr.String())
		}
		
		if err := <-uploadErrCh; err != nil {
			return fmt.Errorf("s3 Upload [%s]: %w", resolution, err)
		}
		
		logger.Info("completed transcode", zap.String("resolution", resolution), zap.String("key", key))

		return nil;
	}

	// transcode 1080p
	if err := transcoder("1080p", key1080, "1920x1080"); err != nil {
		return fmt.Errorf("failed to transcode 1080p: %w", err);
	}

	// transcode 720p
	if err := transcoder("720p", key720, "1280x720"); err != nil {
		return fmt.Errorf("failed to transcode 720p: %w", err);
	}

	// transcode 480p
	if err := transcoder("480p", key480, "854x480"); err != nil {
		return fmt.Errorf("failed to transcode 480p: %w", err);
	}
	

	// build & upload the manifest

	// creating the s3 Endpoint URL
	endpoint := fmt.Sprintf("https://%s.s3.%s.amazonaws.com", bucketName, strings.ReplaceAll(*s3Client.Config.Region, "-", "."))
	
	manifest, err := buildManifest(endpoint, key1080, key720, key480);

	if err != nil {
		return fmt.Errorf("failed to build manifest: %w", err);
	}

	if _, err := s3Client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(manifestKey),
		Body:   strings.NewReader(manifest),
	}); err != nil {
		return fmt.Errorf("upload manifest: %w", err)
	}
	logger.Info("manifest uploaded", zap.String("key", manifestKey))
	
	return nil
}

func buildManifest(endpoint, key1080, key720, key480 string) (string, error) {
	var m3u8 strings.Builder
	m3u8.WriteString("#EXTM3U\n…")
	m3u8.WriteString(endpoint + "/" + key1080 + "\n")
	m3u8.WriteString(endpoint + "/" + key720 + "\n")
	m3u8.WriteString(endpoint + "/" + key480 + "\n")
	return m3u8.String(), nil
}