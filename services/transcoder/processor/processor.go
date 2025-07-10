package processor

import (
	"context"
	"fmt"
	"io"
	"os/exec"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/internal/rabbit"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"go.uber.org/zap"
)

func Process(context context.Context, request rabbit.TranscodeRequest, bucketName, transcodedPrefix, manifestPrefix string, s3Client *s3.S3, session *session.Session) error {
	logger := zap.L().With(zap.String("videoId", request.VideoId));

	// building the S3 keys
	key1080 := fmt.Sprintf("%s/av1/1080p/%s.mp4", transcodedPrefix, request.VideoId)
	key720  := fmt.Sprintf("%s/av1/720p/%s.mp4", transcodedPrefix, request.VideoId)
	// manifestKey := fmt.Sprintf("%s/%s.m3u8", manifestPrefix, request.VideoId)

	// helper to transcode one resolution
	transcoder := func(resolution string, key string, scale string) error {
		logger.Info("transcoding video", zap.String("resolution", resolution));

		// stream original video from S3
		originalVideo, err := s3Client.GetObject(&s3.GetObjectInput{
			Bucket: &bucketName,
			Key: &key,
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

		// c) FFmpeg command
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

		// d) Start FFmpeg
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
	
	return nil;

}