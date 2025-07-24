package processor

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/internal/gemini"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/s3"
	"go.uber.org/zap"
)

var censoredWords = []string{
	"fuck",
	"bitch",
	"bastard",
	"dick",
	"slut",
	"whore",
}

func Process(
	ctx context.Context,
	bucketName string,
	srtKey string,
	s3Client *s3.S3,
	logger *zap.Logger,
) (bool, error) {
	// Download SRT from S3
	obj, err := s3Client.GetObjectWithContext(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(srtKey),
	})
	if err != nil {
		return false, fmt.Errorf("download SRT: %w", err)
	}
	defer obj.Body.Close()

	// Read SRT into memory (could be optimized for very large files)
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, obj.Body); err != nil {
		return false, fmt.Errorf("read SRT: %w", err)
	}
	srtText := buf.String()

	const chunkSize = 5000
	reader := bufio.NewReader(strings.NewReader(srtText))
	for {
		chunk := make([]rune, 0, chunkSize)
		for len(chunk) < chunkSize {
			r, _, err := reader.ReadRune()
			if err == io.EOF {
				break
			}
			if err != nil {
				return false, fmt.Errorf("read chunk: %w", err)
			}
			chunk = append(chunk, r)
		}
		if len(chunk) == 0 {
			break
		}
		chunkStr := string(chunk)

		prompt := gemini.BuildPrompt(chunkStr, censoredWords)
		answer := gemini.AskGemini(ctx, prompt, logger)

		if answer.Error != nil {
			logger.Warn("Gemini check failed", zap.Error(answer.Error))
			continue // or return false, err if you want to fail hard
		}

		if answer.Result {
			logger.Info("Censored text found")
			return true, nil
		}

		if len(chunk) < chunkSize {
			break // last chunk
		}
	}
	return false, nil
}
