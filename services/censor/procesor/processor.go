package procesor

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/s3"
	"go.uber.org/zap"
)

// GeminiRequest/Response are stubs for the Gemini API
// You should update these to match your actual Gemini API contract

type GeminiRequest struct {
	Prompt string `json:"prompt"`
}

type GeminiResponse struct {
	Result string `json:"result"`
}

// Process checks an SRT file for censored words using Gemini
func Process(
	ctx context.Context,
	bucketName string,
	srtKey string,
	s3Client *s3.S3,
	censoredWords []string,
	geminiEndpoint string,
	geminiAPIKey string,
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

		prompt := buildPrompt(chunkStr, censoredWords)
		flagged, err := checkWithGemini(ctx, prompt, geminiEndpoint, geminiAPIKey)
		if err != nil {
			logger.Warn("Gemini check failed", zap.Error(err))
			continue // or return false, err if you want to fail hard
		}
		if flagged {
			return true, nil
		}
		if len(chunk) < chunkSize {
			break // last chunk
		}
	}
	return false, nil
}

func buildPrompt(srtChunk string, censoredWords []string) string {
	return fmt.Sprintf(`You are a content moderation AI. Here is a list of censored words: %s. Here is a chunk of an SRT subtitle file: """
%s
"""
If any of the censored words appear in the SRT chunk, reply with "true". If none appear, reply with "false". Reply with only "true" or "false".`,
		strings.Join(censoredWords, ", "), srtChunk)
}

func checkWithGemini(ctx context.Context, prompt, endpoint, apiKey string) (bool, error) {
	body, _ := json.Marshal(GeminiRequest{Prompt: prompt})
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	var gemResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&gemResp); err != nil {
		return false, err
	}
	result := strings.TrimSpace(strings.ToLower(gemResp.Result))
	if result == "true" {
		return true, nil
	}
	return false, nil
}

