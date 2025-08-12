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
) (types.CaptionsReadyEvent, error){
	cfg, err := config.LoadDefaultConfig(context)
	if err != nil {
		return types.CaptionsReadyEvent{}, fmt.Errorf("couldn't load config cause of : %w", err)
	}

	transcriber := transcribe.NewFromConfig(cfg);
	jobName := fmt.Sprintf("caption-%s-%d", request.VideoId, time.Now().Unix())
    inputURI := fmt.Sprintf("s3://%s/originals/%s", bucketName, request.S3Key)
    jsonKey := fmt.Sprintf("%s/%s.json", transcriberJobPrefix, jobName)
    vttKey := fmt.Sprintf("%s/%s.vtt", captionsPrefix, request.VideoId)

    if err := checkIfVideoExists(context, s3Client, bucketName, request.S3Key, logger); err != nil {
        return types.CaptionsReadyEvent{}, err
    }

	if err := startAWSTranscriptionJob(context, transcriber, bucketName, jobName, inputURI, jsonKey); err != nil {
		return types.CaptionsReadyEvent{}, fmt.Errorf("start transcription job: %w", err)
	}

	logger.Info("AWS Transcription Job Started Successfully", zap.String("jobName", jobName), zap.String("inputURI", inputURI))

    // poll the job for completion
    if err := pollForTranscriptionJob(context, transcriber, jobName, logger); err != nil {
        return types.CaptionsReadyEvent{}, fmt.Errorf("poll for transcription job: %w", err)
    }

    // 4) Download JSON transcript from S3
    obj, err := s3Client.GetObjectWithContext(context, &s3.GetObjectInput{
        Bucket: aws.String(bucketName),
        Key:    aws.String(jsonKey),
    })

    if err != nil {
        return types.CaptionsReadyEvent{}, fmt.Errorf("download transcript JSON: %w", err)
    }

    defer obj.Body.Close()

    var data struct {
        Results struct {
            Items [] TranscriptItem `json:"items"`
        } `json:"results"`
    }
    if err := json.NewDecoder(obj.Body).Decode(&data); err != nil {
        return types.CaptionsReadyEvent{}, fmt.Errorf("decode transcript JSON: %w", err)
    }

    // Validate transcription results
    if len(data.Results.Items) == 0 {
        logger.Error("transcription completed but no transcript items found", 
            zap.String("jobName", jobName))
        return types.CaptionsReadyEvent{}, fmt.Errorf("transcription produced no content - video may have no speech or be too short")
    }

    // Count meaningful words (excluding punctuation)
    wordCount := 0
    for _, item := range data.Results.Items {
        if item.Type == "pronunciation" && len(item.Alternatives) > 0 {
            wordCount++
        }
    }

    if wordCount < 3 {
        logger.Info("not enough words in the video")
        return types.CaptionsReadyEvent{}, nil
    }

    vtt, err := convertToVTT(data.Results.Items)
    if err != nil {
        return types.CaptionsReadyEvent{}, fmt.Errorf("convert to VTT: %w", err)
    }
    if len(vtt) < 30 {
        return types.CaptionsReadyEvent{}, fmt.Errorf("generated VTT content too short (%d bytes)", len(vtt))
    }

    _, err = s3Client.PutObjectWithContext(context, &s3.PutObjectInput{
        Bucket:       aws.String(bucketName),
        Key:          aws.String(vttKey),
        Body:         bytes.NewReader(vtt),
        ContentType:  aws.String("text/vtt"),
        CacheControl: aws.String("public, max-age=31536000"),
    })
    if err != nil {
        return types.CaptionsReadyEvent{}, fmt.Errorf("upload VTT: %w", err)
    }

    logger.Info("uploaded captions", zap.String("vttKey", vttKey))
    
    captionsReadyEvent := types.CaptionsReadyEvent{
        VideoId: request.VideoId,
        S3Key: request.S3Key,
        VTTKey: vttKey,
    }
    return captionsReadyEvent, nil
}

func convertToVTT(items []TranscriptItem) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteString("WEBVTT\n\n")

	seq := 1
	var words []string
	var start, end float64

	flush := func(punct string) {
		if len(words) == 0 {
			return
		}
		// (optional) write an ID line; browsers ignore it but handy for debugging
		fmt.Fprintf(&buf, "%d\n", seq)
		fmt.Fprintf(&buf, "%s --> %s\n", formatTimeVTT(start), formatTimeVTT(end))
		buf.WriteString(strings.Join(words, " ") + punct + "\n\n")
		seq++
		words = nil
	}

	for _, it := range items {
		switch it.Type {
		case "pronunciation":
			st, err1 := strconv.ParseFloat(it.StartTime, 64)
			et, err2 := strconv.ParseFloat(it.EndTime, 64)
			if err1 != nil || err2 != nil || len(it.Alternatives) == 0 {
				continue
			}
			if len(words) == 0 {
				start = st
			}
			end = et
			words = append(words, it.Alternatives[0].Content)
		case "punctuation":
			if len(it.Alternatives) == 0 {
				continue
			}
			flush(it.Alternatives[0].Content)
		}
	}
	flush("")
	return buf.Bytes(), nil
}

func formatTimeVTT(sec float64) string {
	h := int(sec) / 3600
	m := int(sec)%3600 / 60
	s := int(sec) % 60
	ms := int(math.Mod(sec, 1.0) * 1000)
	return fmt.Sprintf("%02d:%02d:%02d.%03d", h, m, s, ms)
}

func checkIfVideoExists(ctx context.Context, s3Client *s3.S3, bucketName, s3Key string, logger *zap.Logger) error {
    headObj, err := s3Client.HeadObjectWithContext(ctx, &s3.HeadObjectInput{
        Bucket: aws.String(bucketName),
        Key:    aws.String(fmt.Sprintf("originals/%s", s3Key)),
    })
    if err != nil {
        return fmt.Errorf("input video file not found: %w", err)
    }

    fileSize := *headObj.ContentLength
    if fileSize < 1024 { // Less than 1KB
        logger.Error("input video file too small", 
            zap.String("s3Key", s3Key),
            zap.Int64("fileSizeBytes", fileSize))
        return fmt.Errorf("input video file too small (%d bytes) - may be corrupted", fileSize)
    }

    return nil
}

func startAWSTranscriptionJob(ctx context.Context, transcriber *transcribe.Client, bucketName, jobName, inputURI, jsonKey string) error {
    if _, err := transcriber.StartTranscriptionJob(ctx, &transcribe.StartTranscriptionJobInput{
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
        },
	}); err != nil {
		return err
	}

	return nil
}

func pollForTranscriptionJob(ctx context.Context, transcriber *transcribe.Client, jobName string, logger *zap.Logger) error {
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
            case <-ctx.Done(): 
                logger.Info("transcription job cancelled due to context", zap.String("jobName", jobName))
                return fmt.Errorf("transcription job cancelled due to context")
            case <-time.After(5 * time.Second): {
                timeout += 5
                out, err := transcriber.GetTranscriptionJob(ctx, &transcribe.GetTranscriptionJobInput{
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
                        return nil
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
}