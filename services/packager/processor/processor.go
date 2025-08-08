package processor

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

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

var renditions = []renditionSpec{
	{Name: "1080p", Resolution: "1920x1080", Bandwidth: 5000000},
	{Name: "720p",  Resolution: "1280x720",  Bandwidth: 3000000},
	{Name: "480p",  Resolution: "854x480",   Bandwidth: 1200000},
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
	log.Info("packaging start")

	uploader := s3manager.NewUploader(sess, func(u *s3manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024
		u.Concurrency = 5
	})

	renditionSegments := make(map[string][]string)

	for _, r := range renditions {
		keys, plBytes, err := buildRenditionPlaylist(ctx, s3Client, bucket, transcodedPrefix, videoID, r, cdnBaseURL)
		if err != nil {
			return fmt.Errorf("rendition %s: %w", r.Name, err)
		}
    
		renditionSegments[r.Name] = keys
		hlsKey := filepath.ToSlash(filepath.Join(packagedPrefix, videoID, "hls", r.Name+".m3u8"))
		if _, err := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
      Bucket:       aws.String(bucket),
      Key:          aws.String(hlsKey),
      Body:         bytes.NewReader(plBytes),
      ContentType:  aws.String("application/vnd.apple.mpegurl"),
      CacheControl: aws.String("public, max-age=3600"),
    }); err != nil {
			return fmt.Errorf("upload HLS %s: %w", r.Name, err)
		}

		log.Info("uploaded rendition playlist", zap.String("key", hlsKey))
	}

	masterBytes, err := buildMasterPlaylist(renditions, cdnBaseURL, packagedPrefix, videoID)
	if err != nil {
		return fmt.Errorf("master m3u8: %w", err)
	}
	masterKey := filepath.ToSlash(filepath.Join(packagedPrefix, videoID, "hls", "master.m3u8"))
	if _, err := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
		Bucket:       aws.String(bucket),
		Key:          aws.String(masterKey),
		Body:         bytes.NewReader(masterBytes),
		ContentType:  aws.String("application/vnd.apple.mpegurl"),
		CacheControl: aws.String("public, max-age=3600"),
	}); err != nil {
		return fmt.Errorf("upload master.m3u8: %w", err)
	}
	log.Info("uploaded master.m3u8", zap.String("key", masterKey))

	// 3) Build DASH MPD (multi-representation, SegmentTemplate)
	mpdBytes, err := buildMPD(videoID, transcodedPrefix, renditionSegments, cdnBaseURL)
	if err != nil {
		return fmt.Errorf("build MPD: %w", err)
	}
	mpdKey := filepath.ToSlash(filepath.Join(packagedPrefix, videoID, "dash", "master.mpd"))
	if _, err := uploader.UploadWithContext(ctx, &s3manager.UploadInput{
		Bucket:       aws.String(bucket),
		Key:          aws.String(mpdKey),
		Body:         bytes.NewReader(mpdBytes),
		ContentType:  aws.String("application/dash+xml"),
		CacheControl: aws.String("public, max-age=3600"),
	}); err != nil {
		return fmt.Errorf("upload master.mpd: %w", err)
	}
	log.Info("uploaded master.mpd", zap.String("key", mpdKey))

	log.Info("packaging complete")
	return nil
}

func buildRenditionPlaylist(
	ctx context.Context,
	s3c *s3.S3,
	bucket, transcodedPrefix, videoID string,
	r renditionSpec,
	cdnBaseURL string,
) ([]string, []byte, error) {
	prefix := filepath.ToSlash(filepath.Join(transcodedPrefix, videoID, r.Name)) + "/"
	var keys []string

	input := &s3.ListObjectsV2Input{Bucket: aws.String(bucket), Prefix: aws.String(prefix)}
	err := s3c.ListObjectsV2PagesWithContext(ctx, input, func(p *s3.ListObjectsV2Output, last bool) bool {
		for _, obj := range p.Contents {
			k := aws.StringValue(obj.Key)
			if strings.HasSuffix(strings.ToLower(k), ".m4s") {
				keys = append(keys, k)
			}
		}
		return true
	})
	if err != nil {
		return nil, nil, fmt.Errorf("list segments: %w", err)
	}
	if len(keys) == 0 {
		return nil, nil, fmt.Errorf("no segments found for %s", r.Name)
	}
	sortByChunkNumber(keys)

	var b bytes.Buffer
	fmt.Fprintln(&b, "#EXTM3U")
	fmt.Fprintln(&b, "#EXT-X-VERSION:7")
	fmt.Fprintln(&b, "#EXT-X-PLAYLIST-TYPE:VOD")
	fmt.Fprintln(&b, "#EXT-X-INDEPENDENT-SEGMENTS")
	fmt.Fprintln(&b, "#EXT-X-TARGETDURATION:4")
	fmt.Fprintln(&b, "#EXT-X-MEDIA-SEQUENCE:0")
	for _, k :=range keys {
		fmt.Fprintln(&b, "#EXTINF:4.000,")
		pathWithoutBucket := strings.TrimPrefix(k, bucket+"/")
		fmt.Fprintf(&b, "%s/%s\n", cdnBaseURL, pathWithoutBucket)
	}
	fmt.Fprintln(&b, "#EXT-X-ENDLIST")

	return keys, b.Bytes(), nil
}

func buildMasterPlaylist(rends []renditionSpec, cdnBaseURL, packagedPrefix, videoID string) ([]byte, error) {
	var b bytes.Buffer
	fmt.Fprintln(&b, "#EXTM3U")
	fmt.Fprintln(&b, "#EXT-X-VERSION:7")
	fmt.Fprintln(&b, "#EXT-X-INDEPENDENT-SEGMENTS")
	for _, r := range rends {
		fmt.Fprintf(&b, "#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%s\n", r.Bandwidth, r.Resolution)
		fmt.Fprintf(&b, "%s/%s/%s/hls/%s.m3u8\n", cdnBaseURL, packagedPrefix, videoID, r.Name)
	}
	return b.Bytes(), nil
}

func buildMPD(videoID, transcodedPrefix string, segments map[string][]string, cdnBaseURL string) ([]byte, error) {
	var b bytes.Buffer
	now := time.Now().UTC().Format(time.RFC3339)

	fmt.Fprintf(&b, `<?xml version="1.0" encoding="UTF-8"?>`+"\n")
	fmt.Fprintf(&b, `<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT%dS" minBufferTime="PT1.5S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" availabilityStartTime="%s">`+"\n", len(totalSegments(segments))*4, now)
	fmt.Fprintln(&b, `<Period>`)

	for _, r := range renditions {
		keys := segments[r.Name]
		if len(keys) == 0 {
			continue
		}
		fmt.Fprintf(&b, `<AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1">`+"\n")
		fmt.Fprintf(&b, `<Representation id="%s" bandwidth="%d" width="%s" height="%s" codecs="avc1.4d401f,mp4a.40.2">`+"\n",
			r.Name, r.Bandwidth, strings.Split(r.Resolution, "x")[0], strings.Split(r.Resolution, "x")[1])
		fmt.Fprintf(&b, `<BaseURL>%s/%s/%s/%s/</BaseURL>`+"\n", cdnBaseURL, transcodedPrefix, videoID, r.Name)
		fmt.Fprintf(&b, `<SegmentTemplate media="chunk-$Number$.m4s" startNumber="0" duration="4" timescale="1"/>`+"\n")
		fmt.Fprintln(&b, `</Representation>`)
		fmt.Fprintln(&b, `</AdaptationSet>`)
	}

	fmt.Fprintln(&b, `</Period>`)
	fmt.Fprintln(&b, `</MPD>`)
	return b.Bytes(), nil
}

var chunkNumRe = regexp.MustCompile(`chunk-(\d+)\.m4s$`)

func sortByChunkNumber(keys []string) {
	sort.Slice(keys, func(i, j int) bool {
		return extractChunkNumber(keys[i]) < extractChunkNumber(keys[j])
	})
}

func extractChunkNumber(key string) int {
	m := chunkNumRe.FindStringSubmatch(strings.ToLower(key))
	if len(m) != 2 {
		return int(time.Now().UnixNano())
	}
	n := 0
	for i := 0; i < len(m[1]); i++ {
		n = n*10 + int(m[1][i]-'0')
	}
	return n
}

func totalSegments(m map[string][]string) []string {
	for _, v := range m {
		if len(v) > 0 {
			return v
		}
	}
	return nil
}
