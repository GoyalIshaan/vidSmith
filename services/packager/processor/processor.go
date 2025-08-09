package processor

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"go.uber.org/zap"
)

type renditionSpec struct {
	Name       string
	Resolution string // WxH
	Bandwidth  int    // peak bitrate in bits/sec
}

// CodecInfo struct removed - using Shaka Packager for codec handling

var renditions = []renditionSpec{
	{Name: "1080p", Resolution: "1920x1080", Bandwidth: 5000000},
	{Name: "720p",  Resolution: "1280x720",  Bandwidth: 3000000},
	{Name: "480p",  Resolution: "854x480",   Bandwidth: 1200000},
}



// downloadSegmentsFromS3 downloads all segments for a rendition to local directory
func downloadSegmentsFromS3(
	ctx context.Context,
	downloader *s3manager.Downloader,
	s3Client *s3.S3,
	bucket, transcodedPrefix, videoID, renditionName, localDir string,
	log *zap.Logger,
) error {
	prefix := path.Join(transcodedPrefix, videoID, renditionName) + "/"
	
	// List all objects in the rendition directory
	err := s3Client.ListObjectsV2PagesWithContext(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String(prefix),
	}, func(p *s3.ListObjectsV2Output, last bool) bool {
		for _, obj := range p.Contents {
			key := aws.StringValue(obj.Key)
			filename := filepath.Base(key)
			localPath := filepath.Join(localDir, filename)
			
			// Download each file
			file, err := os.Create(localPath)
			if err != nil {
				log.Error("failed to create local file", zap.String("path", localPath), zap.Error(err))
				continue
			}
			
			_, err = downloader.DownloadWithContext(ctx, file, &s3.GetObjectInput{
				Bucket: aws.String(bucket),
				Key:    aws.String(key),
			})
			file.Close()
			
			if err != nil {
				log.Error("failed to download segment", zap.String("key", key), zap.Error(err))
				os.Remove(localPath)
				continue
			}
			
			log.Debug("downloaded segment", zap.String("key", key), zap.String("localPath", localPath))
		}
		return true
	})
	
	return err
}

// runShakaPackager creates DASH content using Shaka Packager
func runShakaPackager(
	ctx context.Context,
	inputDir, outputDir string,
	availableRenditions []renditionSpec,
	log *zap.Logger,
) error {
	log.Info("running Shaka Packager to create DASH content")
	
	// Build packager command arguments
	var args []string
	
	// For each rendition, create a complete input specification
	for _, r := range availableRenditions {
		renditionDir := filepath.Join(inputDir, r.Name)
		initFile := filepath.Join(renditionDir, "init.mp4")
		
		// Check if init file exists
		if _, err := os.Stat(initFile); os.IsNotExist(err) {
			log.Warn("skipping rendition, no init file", zap.String("rendition", r.Name))
			continue
		}
		
		// Get all segment files for this rendition
		segmentFiles, err := filepath.Glob(filepath.Join(renditionDir, "chunk*.m4s"))
		if err != nil || len(segmentFiles) == 0 {
			log.Warn("no segments found for rendition", zap.String("rendition", r.Name))
			continue
		}
		
		// Sort segment files to ensure proper order
		sort.Strings(segmentFiles)
		
		// Create input file list for this rendition
		inputListFile := filepath.Join(inputDir, fmt.Sprintf("%s_input.txt", r.Name))
		var inputList strings.Builder
		
		// Add init segment
		inputList.WriteString(initFile + "\n")
		
		// Add all media segments
		for _, segFile := range segmentFiles {
			inputList.WriteString(segFile + "\n")
		}
		
		// Write input list to file
		if err := os.WriteFile(inputListFile, []byte(inputList.String()), 0644); err != nil {
			return fmt.Errorf("write input list for %s: %w", r.Name, err)
		}
		
		// Video output specification
		videoOutput := fmt.Sprintf("in=%s,stream=video,output=%s,playlist_name=%s_video.m3u8",
			inputListFile,
			filepath.Join(outputDir, fmt.Sprintf("%s_video.mp4", r.Name)),
			r.Name,
		)
		args = append(args, videoOutput)
		
		// Audio output specification
		audioOutput := fmt.Sprintf("in=%s,stream=audio,output=%s,playlist_name=%s_audio.m3u8",
			inputListFile,
			filepath.Join(outputDir, fmt.Sprintf("%s_audio.mp4", r.Name)),
			r.Name,
		)
		args = append(args, audioOutput)
	}
	
	// Add MPD output
	args = append(args, "--mpd_output", filepath.Join(outputDir, "manifest.mpd"))
	
	// Add additional flags for better DASH compatibility
	args = append(args, "--generate_static_live_mpd")
	args = append(args, "--segment_duration", "4")
	
	log.Info("running Shaka Packager with args", zap.Strings("args", args))
	
	// Run Shaka Packager
	cmd := exec.CommandContext(ctx, "packager", args...)
	
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Stdout = &stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("shaka packager failed: %w\nOutput: %s", err, stderr.String())
	}
	
	log.Info("Shaka Packager completed successfully")
	return nil
}

// uploadDashFiles uploads the generated DASH files to S3
func uploadDashFiles(
	ctx context.Context,
	uploader *s3manager.Uploader,
	bucket, packagedPrefix, videoID, localDir string,
	log *zap.Logger,
) error {
	log.Info("uploading DASH files to S3")
	
	err := filepath.Walk(localDir, func(localPath string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		
		// Calculate S3 key
		relPath, err := filepath.Rel(localDir, localPath)
		if err != nil {
			return err
		}
		
		s3Key := path.Join(packagedPrefix, videoID, "dash", relPath)
		
		// Open file
		file, err := os.Open(localPath)
		if err != nil {
			return err
		}
		defer file.Close()
		
		// Determine content type
		var contentType string
		if strings.HasSuffix(localPath, ".mpd") {
			contentType = "application/dash+xml"
		} else if strings.HasSuffix(localPath, ".mp4") {
			contentType = "video/mp4"
		} else {
			contentType = "application/octet-stream"
		}
		
		// Upload to S3
		_, err = uploader.UploadWithContext(ctx, &s3manager.UploadInput{
			Bucket:       aws.String(bucket),
			Key:          aws.String(s3Key),
			Body:         file,
			ContentType:  aws.String(contentType),
			CacheControl: aws.String("public, max-age=3600"),
		})
		
		if err != nil {
			return fmt.Errorf("upload %s: %w", s3Key, err)
		}
		
		log.Info("uploaded DASH file", zap.String("key", s3Key))
		return nil
	})
	
	return err
}

func Process(
	ctx context.Context,
	videoID string,
	bucket string,
	transcodedPrefix string,
	packagedPrefix string,
	cdnBaseURL string,
	s3Client *s3.S3,
	sess *session.Session,
	logger *zap.Logger,
) error {
	log := logger.With(zap.String("videoID", videoID))
	log.Info("packaging start with Shaka Packager")

	// Create temporary directories
	tempDir, err := os.MkdirTemp("", "packager-"+videoID)
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	inputDir := filepath.Join(tempDir, "input")
	outputDir := filepath.Join(tempDir, "output")
	
	if err := os.MkdirAll(inputDir, 0755); err != nil {
		return fmt.Errorf("create input dir: %w", err)
	}
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("create output dir: %w", err)
	}

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024
		u.Concurrency = 5
	})

	downloader := s3manager.NewDownloader(sess, func(d *s3manager.Downloader) {
		d.PartSize = 10 * 1024 * 1024
		d.Concurrency = 5
	})

	// 1) Check which renditions are available and download them
	var availableRenditions []renditionSpec
	for _, r := range renditions {
		// Check if this rendition exists in S3
		initKey := path.Join(transcodedPrefix, videoID, r.Name, "init.mp4")
		_, err := s3Client.HeadObjectWithContext(ctx, &s3.HeadObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String(initKey),
		})
		
		if err != nil {
			log.Warn("skipping missing rendition", zap.String("rendition", r.Name), zap.Error(err))
			continue
		}
		
		availableRenditions = append(availableRenditions, r)
		
		// Create directory for this rendition
		renditionDir := filepath.Join(inputDir, r.Name)
		if err := os.MkdirAll(renditionDir, 0755); err != nil {
			return fmt.Errorf("create rendition dir %s: %w", r.Name, err)
		}
		
		// Download all segments for this rendition
		log.Info("downloading segments for rendition", zap.String("rendition", r.Name))
		if err := downloadSegmentsFromS3(ctx, downloader, s3Client, bucket, transcodedPrefix, videoID, r.Name, renditionDir, log); err != nil {
			return fmt.Errorf("download segments for %s: %w", r.Name, err)
		}
	}
	
	if len(availableRenditions) == 0 {
		return fmt.Errorf("no renditions available for packaging")
	}
	
	log.Info("found available renditions", zap.Int("count", len(availableRenditions)))

	// 2) Run Shaka Packager to create DASH content
	if err := runShakaPackager(ctx, inputDir, outputDir, availableRenditions, log); err != nil {
		return fmt.Errorf("shaka packager: %w", err)
	}

	// 3) Upload generated DASH files to S3
	if err := uploadDashFiles(ctx, uploader, bucket, packagedPrefix, videoID, outputDir, log); err != nil {
		return fmt.Errorf("upload DASH files: %w", err)
	}

	// 4) Still generate HLS playlists for compatibility
	renditionSegments := make(map[string][]string)
	for _, r := range availableRenditions {
		keys, plBytes, err := buildRenditionPlaylist(ctx, s3Client, bucket, transcodedPrefix, videoID, r, cdnBaseURL)
		if err != nil {
			log.Warn("failed to build HLS playlist", zap.String("rendition", r.Name), zap.Error(err))
			continue
		}
		
		renditionSegments[r.Name] = keys
		hlsKey := path.Join(packagedPrefix, videoID, "hls", r.Name+".m3u8")
		if _, err := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
			Bucket:       aws.String(bucket),
			Key:          aws.String(hlsKey),
			Body:         bytes.NewReader(plBytes),
			ContentType:  aws.String("application/vnd.apple.mpegurl"),
			CacheControl: aws.String("public, max-age=3600"),
		}); err != nil {
			log.Warn("failed to upload HLS playlist", zap.String("rendition", r.Name), zap.Error(err))
		}
	}

	// Upload HLS master playlist
	masterBytes, err := buildMasterPlaylist(availableRenditions)
	if err == nil {
		masterKey := path.Join(packagedPrefix, videoID, "hls", "master.m3u8")
		uploader.UploadWithContext(ctx, &s3manager.UploadInput{
			Bucket:       aws.String(bucket),
			Key:          aws.String(masterKey),
			Body:         bytes.NewReader(masterBytes),
			ContentType:  aws.String("application/vnd.apple.mpegurl"),
			CacheControl: aws.String("public, max-age=3600"),
		})
		log.Info("uploaded HLS master playlist", zap.String("key", masterKey))
	}

	log.Info("packaging complete with Shaka Packager")
	return nil
}

func buildRenditionPlaylist(
    ctx context.Context,
    s3c *s3.S3,
    bucket, transcodedPrefix, videoID string,
    r renditionSpec,
    cdnBaseURL string,
) ([]string, []byte, error) {
    prefix := path.Join(transcodedPrefix, videoID, r.Name) + "/"

    // List .m4s segments
    var segKeys []string
    var hasInit bool
    err := s3c.ListObjectsV2PagesWithContext(ctx, &s3.ListObjectsV2Input{
        Bucket: aws.String(bucket), Prefix: aws.String(prefix),
    }, func(p *s3.ListObjectsV2Output, last bool) bool {
        for _, obj := range p.Contents {
            k := aws.StringValue(obj.Key)
            lk := strings.ToLower(k)

            if strings.HasSuffix(lk, "init.mp4") { hasInit = true; continue }
            if strings.HasSuffix(lk, ".m4s")     { segKeys = append(segKeys, k) }
        }
        return true
    })
    if err != nil { return nil, nil, fmt.Errorf("list segments: %w", err) }
    if !hasInit { return nil, nil, fmt.Errorf("missing init.mp4 for %s", r.Name) }
    if len(segKeys) == 0 { return nil, nil, fmt.Errorf("no segments for %s", r.Name) }

    sortByChunkNumber(segKeys)
    cdn := strings.TrimRight(cdnBaseURL, "/")

    var b bytes.Buffer
    fmt.Fprintln(&b, "#EXTM3U")
    fmt.Fprintln(&b, "#EXT-X-VERSION:7")
    fmt.Fprintln(&b, "#EXT-X-PLAYLIST-TYPE:VOD")
    fmt.Fprintln(&b, "#EXT-X-INDEPENDENT-SEGMENTS")
    fmt.Fprintln(&b, "#EXT-X-TARGETDURATION:4")
    fmt.Fprintf(&b, "#EXT-X-MEDIA-SEQUENCE:%d\n", 0)
    fmt.Fprintf(&b, "#EXT-X-MAP:URI=\"%s/%s\"\n", cdn, path.Join(transcodedPrefix, videoID, r.Name, "init.mp4"))

    for _, key := range segKeys {
        fmt.Fprintln(&b, "#EXTINF:4.000,")
        fmt.Fprintf(&b, "%s/%s\n", cdn, key) // absolute URI to CDN
    }
    fmt.Fprintln(&b, "#EXT-X-ENDLIST")

    return segKeys, b.Bytes(), nil
}


func buildMasterPlaylist(rends []renditionSpec) ([]byte, error) {
    var b bytes.Buffer
    fmt.Fprintln(&b, "#EXTM3U")
    fmt.Fprintln(&b, "#EXT-X-VERSION:7")
    fmt.Fprintln(&b, "#EXT-X-INDEPENDENT-SEGMENTS")
    for _, r := range rends {
        // libx264 + AAC default; refine if you later set explicit profiles
        fmt.Fprintf(&b, "#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%s,CODECS=\"avc1.640028\"\n",
            r.Bandwidth, r.Resolution)
        fmt.Fprintf(&b, "%s.m3u8\n", r.Name)
    }
    return b.Bytes(), nil
}


func sortByChunkNumber(keys []string) {
	sort.Slice(keys, func(i, j int) bool {
		return extractChunkNumber(keys[i]) < extractChunkNumber(keys[j])
	})
}

var chunkNumRe = regexp.MustCompile(`chunk(\d+)\.m4s$`)

func extractChunkNumber(key string) int {
    m := chunkNumRe.FindStringSubmatch(strings.ToLower(key))
    if len(m) != 2 { return 0 }
    n := 0
    for i := 0; i < len(m[1]); i++ {
        n = n*10 + int(m[1][i]-'0')
    }
    return n
}
