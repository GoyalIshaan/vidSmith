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

	// helper to transcode one resolution
	transcoder := func(resolution string, key string, scale string) error {
		logger.Info("transcoding video", zap.String("resolution", resolution));

		// stream original video from S3
		originalVideo, err := s3Client.GetObject(&s3.GetObjectInput{
			Bucket: &bucketName,
			Key: &originalKey,
		})

		if err != nil {
			return fmt.Errorf("failed to get original video: %w", err)
		}
		// so that the io.ReadCloser is closed when the function returns
		defer originalVideo.Body.Close();

		// pipe into FFmpeg stdin
		prIn, pwIn := io.Pipe();
		go func() {
			defer pwIn.Close();
			io.Copy(pwIn, originalVideo.Body);
		}();

		// FFmpeg command
    	//    -i pipe:0         (read from stdin)
    	//    -vf scale=WxH     (scale filter)
    	//    -c:v libaom-av1   (AV1 codec)
    	//    -f mp4 -movflags frag_keyframe+empty_moov pipe:1
		cmd := exec.CommandContext(context, "ffmpeg",
			"-i", "pipe:0",
			"-vf", "scale="+scale,
			"-c:v", "libaom-av1",
			"-f", "mp4", "-movflags", "frag_keyframe+empty_moov",
			"pipe:1",
		)
		
		cmd.Stdin = prIn;

		// pipe into FFmpeg stdout
		prOut, pwOut := io.Pipe();
		cmd.Stdout = pwOut;

		// Start FFmpeg
		if err := cmd.Start(); err != nil {
			pwOut.Close();
			return fmt.Errorf("failed to start FFmpeg: %w", err);
		}

		uploader := s3manager.NewUploader(session, func (u *s3manager.Uploader) {
			u.PartSize = 5 * 1024 * 1024;
			u.Concurrency = 5
		})

		uploadErrCh := make(chan error, 1)

		go func() {
			defer pwOut.Close()
			_, err := uploader.Upload(&s3manager.UploadInput{
				Bucket: aws.String(bucketName),
				Key:    aws.String(key),
				Body:   prOut,
			})
			uploadErrCh <- fmt.Errorf("s3 Upload [%s]: %w", resolution, err)
		}()

		if err := cmd.Wait(); err != nil {
			return fmt.Errorf("ffmpeg wait [%s]: %w", resolution, err)
		}
		
		if err := <-uploadErrCh; err != nil {
			return err
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