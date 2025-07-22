package processor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/captions/types"
	"github.com/aws/aws-sdk-go-v2/config"
	transcribe "github.com/aws/aws-sdk-go-v2/service/transcribe"
	transcribeTypes "github.com/aws/aws-sdk-go-v2/service/transcribe/types"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"go.uber.org/zap"
)

type TranscriptItem struct {
    StartTime    string `json:"start_time"`
    EndTime      string `json:"end_time"`
    Alternatives []struct {
        Content string `json:"content"`
    } `json:"alternatives"`
    Type string `json:"type"`
}


func Proces(
	context context.Context, 
	request types.CaptionsRequest,
	bucketName, captionsPrefix, transcriberJobPrefix string, 
	s3Client *s3.S3, 
	awsSession *session.Session,
	logger *zap.Logger,
) error{
	cfg, err := config.LoadDefaultConfig(context)
	if err != nil {
		return fmt.Errorf("Couldn't load config cause of : %w", err)
	}

	transcriber := transcribe.NewFromConfig(cfg);
	
	jobName := fmt.Sprintf("caption-%s-%d", request.VideoId, time.Now().Unix())
    inputURI := fmt.Sprintf("s3://%s/%s", bucketName, request.S3Key)
    jsonKey := fmt.Sprintf("%s/%s.json", transcriberJobPrefix, jobName)
    srtKey := fmt.Sprintf("%s/%s.srt", captionsPrefix, request.VideoId)

	if _, err = transcriber.StartTranscriptionJob(context, &transcribe.StartTranscriptionJobInput{
		TranscriptionJobName: &jobName,
		LanguageCode: "en-US",
        Media: &transcribeTypes.Media{
            MediaFileUri: aws.String(inputURI),
        },
        OutputBucketName: aws.String(bucketName),
        OutputKey:        aws.String(jsonKey),
	}); err != nil {
		return fmt.Errorf("start transcription job: %w", err)
	}

	logger.Info("Transcription Job Started")

	for {
        select {
        case <-context.Done():
            return context.Err()
        case <-time.After(5 * time.Second):
            out, err := transcriber.GetTranscriptionJob(context, &transcribe.GetTranscriptionJobInput{
                TranscriptionJobName: aws.String(jobName),
            })
            if err != nil {
                return fmt.Errorf("get transcription job: %w", err)
            }
            status := string(out.TranscriptionJob.TranscriptionJobStatus)
            switch status {
            case "COMPLETED":
                logger.Info("transcription completed", zap.String("jobName", jobName))
                goto DOWNLOAD
            case "FAILED":
                return fmt.Errorf("transcription failed: %s",
                    aws.StringValue(out.TranscriptionJob.FailureReason))
            default:
            }
        }
    }

	DOWNLOAD:
    // 4) Download JSON transcript from S3
    obj, err := s3Client.GetObjectWithContext(context, &s3.GetObjectInput{
        Bucket: aws.String(bucketName),
        Key:    aws.String(jsonKey),
    })
    if err != nil {
        return fmt.Errorf("download transcript JSON: %w", err)
    }
    defer obj.Body.Close()

    var data struct {
        Results struct {
            Items [] TranscriptItem `json:"items"`
        } `json:"results"`
    }
    if err := json.NewDecoder(obj.Body).Decode(&data); err != nil {
        return fmt.Errorf("decode transcript JSON: %w", err)
    }

    // 5) Convert to SRT
    srt, err := toSRT(data.Results.Items)
    if err != nil {
        return fmt.Errorf("convert to SRT: %w", err)
    }

    // 6) Upload the .srt back to S3
    _, err = s3Client.PutObjectWithContext(context, &s3.PutObjectInput{
        Bucket:      aws.String(bucketName),
        Key:         aws.String(srtKey),
        Body:        bytes.NewReader(srt),
        ContentType: aws.String("application/x-subrip"),
        ACL:         aws.String("private"),
    })
    if err != nil {
        return fmt.Errorf("upload SRT: %w", err)
    }

    logger.Info("uploaded SRT", zap.String("srtKey", srtKey))
    return nil
}

// toSRT takes the sequence of Transcribe items and emits valid SRT bytes.
func toSRT(items []TranscriptItem) ([]byte, error) {
    var buf bytes.Buffer
    seq := 1
    var words []string
    var start, end float64

    flush := func(punct string) {
        if len(words) == 0 {
            return
        }
        buf.WriteString(strconv.Itoa(seq) + "\n")
        buf.WriteString(formatTime(start) + " --> " + formatTime(end) + "\n")
        buf.WriteString(strings.Join(words, " ") + punct + "\n\n")
        seq++
        words = nil
    }

    for _, it := range items {
        switch it.Type {
        case "pronunciation":
            st, _ := strconv.ParseFloat(it.StartTime, 64)
            et, _ := strconv.ParseFloat(it.EndTime, 64)
            if len(words) == 0 {
                start = st
            }
            end = et
            words = append(words, it.Alternatives[0].Content)
        case "punctuation":
            flush(it.Alternatives[0].Content)
        }
    }
    // final flush
    flush("")
    return buf.Bytes(), nil
}

// formatTime converts seconds to "hh:mm:ss,mmm"
func formatTime(sec float64) string {
    h := int(sec) / 3600
    m := int(sec)%3600 / 60
    s := int(sec) % 60
    ms := int(math.Mod(sec, 1.0) * 1000)
    return fmt.Sprintf("%02d:%02d:%02d,%03d", h, m, s, ms)
}

