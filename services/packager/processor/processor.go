package processor

import (
	"bytes"
	"context"
	"fmt"
	"path"
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


	masterKey := path.Join(packagedPrefix, videoID, "hls", "master.m3u8")
	mpdKey := path.Join(packagedPrefix, videoID, "dash", "master.mpd")

	for _, r := range renditions {
		keys, plBytes, err := buildRenditionPlaylist(ctx, s3Client, bucket, transcodedPrefix, videoID, r, cdnBaseURL)
		if err != nil {
			return fmt.Errorf("rendition %s: %w", r.Name, err)
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
			return fmt.Errorf("upload HLS %s: %w", r.Name, err)
		}

		log.Info("uploaded rendition playlist", zap.String("key", hlsKey))
	}

	masterBytes, err := buildMasterPlaylist(renditions)
	if err != nil {
		return fmt.Errorf("master m3u8: %w", err)
	}

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


func buildMPD(videoID, transcodedPrefix string, segments map[string][]string, cdnBaseURL string) ([]byte, error) {
    cdn := strings.TrimRight(cdnBaseURL, "/")
    maxN := 0
    for _, v := range segments { if len(v) > maxN { maxN = len(v) } }
    if maxN == 0 { return nil, fmt.Errorf("no segments found for MPD") }

    var b bytes.Buffer
    fmt.Fprintf(&b, `<?xml version="1.0" encoding="UTF-8"?>`+"\n")
    fmt.Fprintf(&b, `<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT%dS" minBufferTime="PT4S" profiles="urn:mpeg:dash:profile:isoff-main:2011">`+"\n", maxN*4)
    fmt.Fprintln(&b, `<Period>`)
    
    // Video adaptation set
    fmt.Fprintln(&b, `<AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1" contentType="video">`)
    for _, r := range renditions {
        segs := segments[r.Name]
        if len(segs) == 0 { continue }
        sortByChunkNumber(segs)
        wh := strings.Split(r.Resolution, "x")
        w, h := wh[0], wh[1]

        fmt.Fprintf(&b, `<Representation id="%s" bandwidth="%d" width="%s" height="%s" codecs="avc1.64001e" frameRate="25">`+"\n", r.Name, r.Bandwidth, w, h)
        fmt.Fprintf(&b, `<BaseURL>%s/%s/</BaseURL>`+"\n", cdn, path.Join(transcodedPrefix, videoID, r.Name))
        
        // Use proper timescale for DASH (90000 is MPEG standard)
        ts := 90000
        segDur := 360000 // 4s in 90kHz timescale (4 * 90000)
        startNum := extractChunkNumber(path.Base(segs[0]))
        if startNum == 0 { startNum = 1 } // avoid 0
        
        fmt.Fprintf(&b, `<SegmentList timescale="%d" duration="%d" startNumber="%d">`+"\n", ts, segDur, startNum)
        fmt.Fprintln(&b, `<Initialization sourceURL="init.mp4"/>`)
        for _, k := range segs {
            fmt.Fprintf(&b, `<SegmentURL media="%s"/>`+"\n", path.Base(k))
        }
        fmt.Fprintln(&b, `</SegmentList>`)
        fmt.Fprintln(&b, `</Representation>`)
    }
    fmt.Fprintln(&b, `</AdaptationSet>`)
    
    // Audio adaptation set
    fmt.Fprintln(&b, `<AdaptationSet mimeType="audio/mp4" segmentAlignment="true" contentType="audio">`)
    // Use first rendition for audio segments (all should have same audio)
    firstRendition := renditions[0]
    segs := segments[firstRendition.Name]
    if len(segs) > 0 {
        fmt.Fprintf(&b, `<Representation id="audio" bandwidth="128000" audioSamplingRate="48000" codecs="mp4a.40.2">`+"\n")
        fmt.Fprintf(&b, `<AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>`+"\n")
        fmt.Fprintf(&b, `<BaseURL>%s/%s/</BaseURL>`+"\n", cdn, path.Join(transcodedPrefix, videoID, firstRendition.Name))
        
        ts := 90000
        segDur := 360000 // 4s in 90kHz timescale
        startNum := extractChunkNumber(path.Base(segs[0]))
        if startNum == 0 { startNum = 1 }
        
        fmt.Fprintf(&b, `<SegmentList timescale="%d" duration="%d" startNumber="%d">`+"\n", ts, segDur, startNum)
        fmt.Fprintln(&b, `<Initialization sourceURL="init.mp4"/>`)
        for _, k := range segs {
            fmt.Fprintf(&b, `<SegmentURL media="%s"/>`+"\n", path.Base(k))
        }
        fmt.Fprintln(&b, `</SegmentList>`)
        fmt.Fprintln(&b, `</Representation>`)
    }
    fmt.Fprintln(&b, `</AdaptationSet>`)

    fmt.Fprintln(&b, `</Period>`)
    fmt.Fprintln(&b, `</MPD>`)
    return b.Bytes(), nil
}


func sortByChunkNumber(keys []string) {
	sort.Slice(keys, func(i, j int) bool {
		return extractChunkNumber(keys[i]) < extractChunkNumber(keys[j])
	})
}

var chunkNumRe = regexp.MustCompile(`chunk-(\d+)\.m4s$`)

func extractChunkNumber(key string) int {
    m := chunkNumRe.FindStringSubmatch(strings.ToLower(key))
    if len(m) != 2 { return 0 }
    n := 0
    for i := 0; i < len(m[1]); i++ {
        n = n*10 + int(m[1][i]-'0')
    }
    return n
}
