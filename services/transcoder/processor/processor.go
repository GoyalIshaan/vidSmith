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

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10MB parts
		u.Concurrency = 5
	})

	// Transcode for each rendition using the downloaded local file.
	for _, r := range renditions {
		if err := processSingleRendition(ctx, s3Client, uploader, bucketName, originalKey, transcodedPrefix, request.VideoId, r, stagingDir, logger); err != nil {
			return fmt.Errorf("rendition %s: %w", r.Name, err)
		}
	}

	return nil
}

func processSingleRendition(
	ctx context.Context,
  	s3Client *s3.S3,
  	uploader *s3manager.Uploader,
	bucket, originalKey, transcodedPrefix, videoID string,
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

	prIn, pwIn := io.Pipe()
	prList, pwList := io.Pipe()

	go func() {
		defer pwIn.Close()
		resp, err := s3Client.GetObjectWithContext(ctx, &s3.GetObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String(originalKey),
		})
		if err != nil {
			pwIn.CloseWithError(err)
			return
		}
		
		defer resp.Body.Close()
		io.Copy(pwIn, resp.Body)
	}()


	ffmpegCommand := exec.CommandContext(ctx, "ffmpeg", argBuilder(r, reditionDirKey)...)
	ffmpegCommand.Stdin = prIn
	ffmpegCommand.Stdout = pwList

	var stderrBuf bytes.Buffer
	ffmpegCommand.Stderr = &stderrBuf

	if err := ffmpegCommand.Start(); err != nil {
		return fmt.Errorf("ffmpeg (%s): %w", r.Name, err)
	}

	var wg sync.WaitGroup
	scanner := bufio.NewScanner(prList)

	go detectNewChunk(scanner, &wg, transcodedPrefix, videoID, r.Name, log, uploader, bucket, ctx)

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
	transcodedPrefix, videoID, renditionName string,
	log *zap.Logger,
	uploader *s3manager.Uploader,
	bucket string,
	ctx context.Context,
) {
	for scanner.Scan() {
		localPath := scanner.Text()
		fileName := filepath.Base(localPath)
		s3Key := filepath.Join(transcodedPrefix, videoID, renditionName, fileName)
		
		wg.Add(1)
		go uploadChunk(uploader, bucket, s3Key, localPath, log, wg, ctx)
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

func argBuilder(r renditionSpec, segDir string) []string {
    return []string{
        // 1) Minimal logging
        "-hide_banner",
        "-loglevel", "warning",

        // 2) Read from stdin
        "-i", "pipe:0",

        // 3) Explicit stream mapping
        "-map", "0:v:0",    // video only from first input stream
        "-map", "0:a:0?",   // audio from first stream if present

        // 4) Resize
        "-vf", "scale=" + r.Scale,

        // 5) Video encode: CRF-based quality mode
        "-c:v", "libx264",
        "-preset", "medium",        // tune encode speed vs. quality
        "-crf", r.CRF,              // constant‐quality target
        "-b:v", "0",                // disable bitrate ceiling in CRF mode

        // 6) Audio encode
        "-c:a", "aac",
        "-b:a", "128k",

        // 7) Fragmented MP4 settings
        "-movflags", "frag_keyframe+empty_moov",

        // 8) Segmenter muxer
        "-f", "segment",
        "-segment_time", "4",            // ~4s chunks
        "-segment_format", "mp4",        // fMP4 (CMAF) container
        "-reset_timestamps", "1",        // each segment’s timestamps start at 0

        // 9) Tell ffmpeg to list each filename to stdout as soon as it's closed
        "-segment_list", "pipe:1",
        "-segment_list_type", "flat",

        // 10) Pattern for the actual chunk files
        filepath.Join(segDir, "chunk-%03d.m4s"),
    }
}
