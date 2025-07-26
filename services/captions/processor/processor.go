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


func Process(
	context context.Context, 
	request types.CaptionsRequest,
	bucketName, captionsPrefix, transcriberJobPrefix string, 
	s3Client *s3.S3, 
	logger *zap.Logger,
) error{
	cfg, err := config.LoadDefaultConfig(context)
	if err != nil {
		return fmt.Errorf("couldn't load config cause of : %w", err)
	}

	transcriber := transcribe.NewFromConfig(cfg);
	
	jobName := fmt.Sprintf("caption-%s-%d", request.VideoId, time.Now().Unix())
    inputURI := fmt.Sprintf("s3://%s/originals/%s", bucketName, request.S3Key)
    jsonKey := fmt.Sprintf("%s/%s.json", transcriberJobPrefix, jobName)
    srtKey := fmt.Sprintf("%s/%s.srt", captionsPrefix, request.VideoId)

    // Validate input file exists and has reasonable size
    headObj, err := s3Client.HeadObjectWithContext(context, &s3.HeadObjectInput{
        Bucket: aws.String(bucketName),
        Key:    aws.String(fmt.Sprintf("originals/%s", request.S3Key)),
    })
    if err != nil {
        return fmt.Errorf("input video file not found: %w", err)
    }

    fileSize := *headObj.ContentLength
    if fileSize < 1024 { // Less than 1KB
        logger.Error("input video file too small", 
            zap.String("s3Key", request.S3Key),
            zap.Int64("fileSizeBytes", fileSize))
        return fmt.Errorf("input video file too small (%d bytes) - may be corrupted", fileSize)
    }

    logger.Info("starting transcription", 
        zap.String("jobName", jobName),
        zap.String("inputURI", inputURI),
        zap.Int64("fileSizeBytes", fileSize))

	if _, err = transcriber.StartTranscriptionJob(context, &transcribe.StartTranscriptionJobInput{
		TranscriptionJobName: &jobName,
		LanguageCode: transcribeTypes.LanguageCodeEnUs,
        Media: &transcribeTypes.Media{
            MediaFileUri: aws.String(inputURI),
        },
        OutputBucketName: aws.String(bucketName),
        OutputKey:        aws.String(jsonKey),
        Settings: &transcribeTypes.Settings{
            ShowSpeakerLabels: aws.Bool(false), // Disable speaker labels for faster processing
            ShowAlternatives: aws.Bool(false),  // Disable alternatives for cleaner output
            // MaxSpeakerLabels removed - not needed when ShowSpeakerLabels is false
        },
	}); err != nil {
		return fmt.Errorf("start transcription job: %w", err)
	}

	logger.Info("AWS Transcription Job Started Successfully", 
        zap.String("jobName", jobName),
        zap.String("inputURI", inputURI))

    // poll the job for completion
    timeout := 0
    maxTimeout := 1800 // 30 minutes instead of 1 hour for faster feedback
	for {
        if (timeout >= maxTimeout) {
            logger.Error("transcription job timeout", 
                zap.String("jobName", jobName),
                zap.Int("timeoutSeconds", timeout))
            return fmt.Errorf("transcription job ran for over %d seconds", maxTimeout)
        }
        
        select {
            case <-context.Done(): 
                logger.Info("transcription job cancelled due to context", zap.String("jobName", jobName))
                return context.Err()
            case <-time.After(5 * time.Second): {
                timeout += 5
                out, err := transcriber.GetTranscriptionJob(context, &transcribe.GetTranscriptionJobInput{
                    TranscriptionJobName: aws.String(jobName),
                })
                if err != nil {
                    logger.Error("failed to get transcription job status", 
                        zap.Error(err), 
                        zap.String("jobName", jobName))
                    return fmt.Errorf("get transcription job: %w", err)
                }
                status := string(out.TranscriptionJob.TranscriptionJobStatus)
                logger.Debug("transcription job status", 
                    zap.String("status", status), 
                    zap.String("jobName", jobName),
                    zap.Int("timeoutSeconds", timeout))
                
                switch status {
                    case "COMPLETED": {
                        logger.Info("transcription completed", 
                            zap.String("jobName", jobName),
                            zap.Int("durationSeconds", timeout))
                        goto DOWNLOAD
                    }
                    case "FAILED": {
                        failureReason := aws.StringValue(out.TranscriptionJob.FailureReason)
                        logger.Error("transcription job failed", 
                            zap.String("jobName", jobName),
                            zap.String("failureReason", failureReason))
                        return fmt.Errorf("transcription failed: %s", failureReason)
                    }
                    case "IN_PROGRESS":
                        // Continue polling
                    default:
                        logger.Warn("unknown transcription status", 
                            zap.String("status", status),
                            zap.String("jobName", jobName))
                }
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

    // Validate transcription results
    if len(data.Results.Items) == 0 {
        logger.Error("transcription completed but no transcript items found", 
            zap.String("jobName", jobName))
        return fmt.Errorf("transcription produced no content - video may have no speech or be too short")
    }

    // Count meaningful words (excluding punctuation)
    wordCount := 0
    for _, item := range data.Results.Items {
        if item.Type == "pronunciation" && len(item.Alternatives) > 0 {
            wordCount++
        }
    }

    if wordCount < 3 { // Require at least 3 words for meaningful content
        logger.Error("transcription completed but insufficient content", 
            zap.String("jobName", jobName),
            zap.Int("wordCount", wordCount))
        return fmt.Errorf("transcription produced insufficient content (%d words) - video may be too short or have no clear speech", wordCount)
    }

    logger.Info("transcription validation passed", 
        zap.String("jobName", jobName),
        zap.Int("itemCount", len(data.Results.Items)),
        zap.Int("wordCount", wordCount))

    // 5) Convert to SRT
    srt, err := toSRT(data.Results.Items)
    if err != nil {
        return fmt.Errorf("convert to SRT: %w", err)
    }

    // Validate SRT content
    srtLength := len(srt)
    if srtLength < 50 { // SRT should have at least 50 characters for meaningful content
        logger.Error("generated SRT content too short", 
            zap.String("jobName", jobName),
            zap.Int("srtLength", srtLength),
            zap.String("srtPreview", string(srt)))
        return fmt.Errorf("generated SRT content too short (%d bytes) - insufficient transcription", srtLength)
    }

    logger.Info("SRT generation successful", 
        zap.String("jobName", jobName),
        zap.Int("srtLength", srtLength))

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
            case "pronunciation": {
                st, err1 := strconv.ParseFloat(it.StartTime, 64)
                et, err2 := strconv.ParseFloat(it.EndTime, 64)
                if err1 != nil || err2 != nil {
                    continue
                }
                if len(it.Alternatives) == 0 {
                    continue
                }
                if len(words) == 0 {
                    start = st
                }
                end = et
                words = append(words, it.Alternatives[0].Content)
                break
            }
            case "punctuation": {
                if len(it.Alternatives) == 0 {
                    continue
                }
                flush(it.Alternatives[0].Content)
                break
            }
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