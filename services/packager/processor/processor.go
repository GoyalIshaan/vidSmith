package processor

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
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

type CodecInfo struct {
	VideoCodec string
	AudioCodec string
	AudioSampleRate int
}

var renditions = []renditionSpec{
	{Name: "1080p", Resolution: "1920x1080", Bandwidth: 5000000},
	{Name: "720p",  Resolution: "1280x720",  Bandwidth: 3000000},
	{Name: "480p",  Resolution: "854x480",   Bandwidth: 1200000},
}

// parseCodecsFromInit extracts codec information from init.mp4 by parsing MP4 boxes
func parseCodecsFromInit(ctx context.Context, s3Client *s3.S3, bucket, initKey string) (*CodecInfo, error) {
	// Download init.mp4 from S3
	resp, err := s3Client.GetObjectWithContext(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(initKey),
	})
	if err != nil {
		return nil, fmt.Errorf("download init.mp4: %w", err)
	}
	defer resp.Body.Close()

	// Read the entire init.mp4 into memory (should be small)
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read init.mp4: %w", err)
	}

	return parseMP4Codecs(data)
}

// parseMP4Codecs parses MP4 boxes to extract codec information
func parseMP4Codecs(data []byte) (*CodecInfo, error) {
	codecs := &CodecInfo{
		VideoCodec: "avc1.64001e", // fallback
		AudioCodec: "mp4a.40.2",   // fallback
		AudioSampleRate: 48000,    // fallback
	}

	reader := bytes.NewReader(data)
	
	for {
		box, err := readMP4Box(reader)
		if err == io.EOF {
			break
		}
		if err != nil {
			return codecs, nil // return fallback on parse errors
		}

		switch box.Type {
		case "moov":
			// Parse movie box for track information
			if err := parseMovieBox(box.Data, codecs); err == nil {
				return codecs, nil
			}
		}
	}

	return codecs, nil
}

type mp4Box struct {
	Size uint32
	Type string
	Data []byte
}

func readMP4Box(r io.Reader) (*mp4Box, error) {
	var header [8]byte
	if _, err := io.ReadFull(r, header[:]); err != nil {
		return nil, err
	}

	size := binary.BigEndian.Uint32(header[0:4])
	boxType := string(header[4:8])

	if size < 8 {
		return nil, fmt.Errorf("invalid box size: %d", size)
	}

	dataSize := size - 8
	data := make([]byte, dataSize)
	if _, err := io.ReadFull(r, data); err != nil {
		return nil, err
	}

	return &mp4Box{
		Size: size,
		Type: boxType,
		Data: data,
	}, nil
}

func parseMovieBox(data []byte, codecs *CodecInfo) error {
	reader := bytes.NewReader(data)
	
	for {
		box, err := readMP4Box(reader)
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		if box.Type == "trak" {
			parseTrackBox(box.Data, codecs)
		}
	}
	
	return nil
}

func parseTrackBox(data []byte, codecs *CodecInfo) {
	reader := bytes.NewReader(data)
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		if box.Type == "mdia" {
			parseMediaBox(box.Data, codecs)
		}
	}
}

func parseMediaBox(data []byte, codecs *CodecInfo) {
	reader := bytes.NewReader(data)
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		switch box.Type {
		case "mdhd":
			// Media header - extract timescale/sample rate
			if len(box.Data) >= 20 {
				// Skip version and flags (4 bytes), creation/modification time (8 bytes)
				timescale := binary.BigEndian.Uint32(box.Data[12:16])
				if timescale > 1000 && timescale <= 48000 {
					codecs.AudioSampleRate = int(timescale)
				}
			}
		case "minf":
			parseMediaInfoBox(box.Data, codecs)
		}
	}
}

func parseMediaInfoBox(data []byte, codecs *CodecInfo) {
	reader := bytes.NewReader(data)
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		if box.Type == "stbl" {
			parseSampleTableBox(box.Data, codecs)
		}
	}
}

func parseSampleTableBox(data []byte, codecs *CodecInfo) {
	reader := bytes.NewReader(data)
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		if box.Type == "stsd" {
			parseSampleDescriptionBox(box.Data, codecs)
		}
	}
}

func parseSampleDescriptionBox(data []byte, codecs *CodecInfo) {
	if len(data) < 8 {
		return
	}

	reader := bytes.NewReader(data[8:]) // Skip version, flags, and entry count
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		switch box.Type {
		case "avc1", "avc3":
			// H.264 video
			if videoCodec := parseAVCCodec(box.Data); videoCodec != "" {
				codecs.VideoCodec = videoCodec
			}
		case "mp4a":
			// AAC audio
			if audioCodec := parseAudioCodec(box.Data); audioCodec != "" {
				codecs.AudioCodec = audioCodec
			}
		}
	}
}

func parseAVCCodec(data []byte) string {
	// Look for avcC box within avc1/avc3
	reader := bytes.NewReader(data[78:]) // Skip visual sample entry fields
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		if box.Type == "avcC" && len(box.Data) >= 4 {
			// Extract profile, profile compatibility, and level
			profile := box.Data[1]
			profileCompat := box.Data[2]
			level := box.Data[3]
			
			return fmt.Sprintf("avc1.%02x%02x%02x", profile, profileCompat, level)
		}
	}
	
	return ""
}

func parseAudioCodec(data []byte) string {
	// Look for esds box within mp4a
	reader := bytes.NewReader(data[28:]) // Skip audio sample entry fields
	
	for {
		box, err := readMP4Box(reader)
		if err != nil {
			break
		}

		if box.Type == "esds" && len(box.Data) >= 5 {
			// Parse elementary stream descriptor to get audio object type
			// This is a simplified parser - in practice, ESDS is more complex
			for i := 0; i < len(box.Data)-1; i++ {
				if box.Data[i] == 0x40 { // Audio ISO/IEC 14496-3
					return "mp4a.40.2" // AAC LC
				}
			}
		}
	}
	
	return ""
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

	var availableRenditions []renditionSpec
	for _, r := range renditions {
		keys, plBytes, err := buildRenditionPlaylist(ctx, s3Client, bucket, transcodedPrefix, videoID, r, cdnBaseURL)
		if err != nil {
			log.Warn("skipping missing rendition", zap.String("rendition", r.Name), zap.Error(err))
			continue
		}
    
		renditionSegments[r.Name] = keys
		availableRenditions = append(availableRenditions, r)
		
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
	
	if len(availableRenditions) == 0 {
		return fmt.Errorf("no renditions available for packaging")
	}
	
	log.Info("packaging with available renditions", zap.Int("count", len(availableRenditions)))

	masterBytes, err := buildMasterPlaylist(availableRenditions)
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

	// 3) Parse codec information from first available rendition's init.mp4
	firstRendition := availableRenditions[0]
	initKey := path.Join(transcodedPrefix, videoID, firstRendition.Name, "init.mp4")
	var codecInfo *CodecInfo
	codecInfo, err = parseCodecsFromInit(ctx, s3Client, bucket, initKey)
	if err != nil {
		log.Warn("failed to parse codecs, using defaults", zap.Error(err))
		codecInfo = &CodecInfo{
			VideoCodec: "avc1.64001e",
			AudioCodec: "mp4a.40.2", 
			AudioSampleRate: 48000,
		}
	}
	log.Info("detected codecs", 
		zap.String("video", codecInfo.VideoCodec), 
		zap.String("audio", codecInfo.AudioCodec),
		zap.Int("sampleRate", codecInfo.AudioSampleRate))

	// 4) Build DASH MPD with parsed codec information
	mpdBytes, err := buildMPD(videoID, transcodedPrefix, renditionSegments, cdnBaseURL, codecInfo, availableRenditions)
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


func buildMPD(videoID, transcodedPrefix string, segments map[string][]string, cdnBaseURL string, codecInfo *CodecInfo, availableRenditions []renditionSpec) ([]byte, error) {
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
    for _, r := range availableRenditions {
        segs := segments[r.Name]
        if len(segs) == 0 { continue }
        sortByChunkNumber(segs)
        wh := strings.Split(r.Resolution, "x")
        w, h := wh[0], wh[1]

        fmt.Fprintf(&b, `<Representation id="%s" bandwidth="%d" width="%s" height="%s" codecs="%s" frameRate="25">`+"\n", r.Name, r.Bandwidth, w, h, codecInfo.VideoCodec)
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
    // Use first available rendition for audio segments (all should have same audio)
    firstRendition := availableRenditions[0]
    segs := segments[firstRendition.Name]
    if len(segs) > 0 {
        fmt.Fprintf(&b, `<Representation id="audio" bandwidth="128000" audioSamplingRate="%d" codecs="%s">`+"\n", codecInfo.AudioSampleRate, codecInfo.AudioCodec)
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
