package processor

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"go.uber.org/zap"
)

var renditions = []string{"1080p", "720p", "480p"}

// PackageVideo generates HLS & DASH manifests by streaming segments over HTTP.
func Process(
  ctx context.Context,
  videoID, bucket, rawDomain, packagedPrefix string,
  s3Client *s3.S3,
  sess *session.Session,
  logger *zap.Logger,
) error {
  logger = logger.With(zap.String("videoID", videoID))
  logger.Info("packaging start")

  args := []string{}
  for _, res := range renditions {
    baseURL := fmt.Sprintf("https://%s/%s/%s", rawDomain, videoID, res)
    // audio & video from same fMP4 segments
    args = append(args,
      fmt.Sprintf("in=%s/chunk-000.m4s,stream=audio,init_segment=%s/chunk-000.m4s,segment_template=%s/chunk-$Number$.m4s", baseURL, baseURL, baseURL),
      fmt.Sprintf("in=%s/chunk-000.m4s,stream=video,init_segment=%s/chunk-000.m4s,segment_template=%s/chunk-$Number$.m4s", baseURL, baseURL, baseURL),
    )
  }

  hlsPath := filepath.Join(os.TempDir(), "hls-master.m3u8")
  mpdPath := filepath.Join(os.TempDir(), "dash-manifest.mpd")
  args = append(args,
    "--hls_master_playlist_output", hlsPath,
    "--mpd_output", mpdPath,
  )

  logger.Info("running packager", zap.Strings("args", args))
  cmd := exec.CommandContext(ctx, "packager", args...)
  var stderr bytes.Buffer
  cmd.Stderr = &stderr
  if err := cmd.Run(); err != nil {
    return fmt.Errorf("packager failed: %w\n%s", err, stderr.String())
  }

  uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10MB parts
		u.Concurrency = 5
	})

  upload := func(localPath, s3Subpath, contentType string) error {
    f, err := os.Open(localPath)
    if err != nil {
      return err
    }
    defer f.Close()
    s3Key := fmt.Sprintf("%s/%s", packagedPrefix, s3Subpath)
    if _, err := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
      Bucket:      aws.String(bucket),
      Key:         aws.String(s3Key),
      Body:        f,
      ContentType: aws.String(contentType),
      CacheControl: aws.String("public, max-age=60"), // short TTL for manifests
    }); err != nil {
      return err
    }
    logger.Info("uploaded manifest", zap.String("key", s3Key))
    return nil
  }

  if err := upload(hlsPath, fmt.Sprintf("%s/hls/master.m3u8", videoID), "application/vnd.apple.mpegurl"); err != nil {
    return fmt.Errorf("upload HLS master: %w", err)
  }
  if err := upload(mpdPath, fmt.Sprintf("%s/dash/manifest.mpd", videoID), "application/dash+xml"); err != nil {
    return fmt.Errorf("upload DASH manifest: %w", err)
  }

  logger.Info("packaging complete")
  return nil
}
