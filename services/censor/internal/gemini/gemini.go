package gemini

import (
	"context"
	"fmt"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/types"
	"go.uber.org/zap"
	"google.golang.org/genai"
)

// AskGemini prompts the Gemini model and returns a GeminiReturns struct
func AskGemini(ctx context.Context, prompt string, apiKey string, logger *zap.Logger) types.GeminiReturns {
	if apiKey == "" {
		return types.GeminiReturns{
			Result: false,
			Error:  fmt.Errorf("GEMINI_API_KEY environment variable is not set"),
		}
	}

	// Create client with proper configuration
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return types.GeminiReturns{
			Result: false,
			Error:  fmt.Errorf("failed to create Gemini client: %w", err),
		}
	}

	// Generate content using the correct model name
	response, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash-001", // Use correct model name
		genai.Text(prompt),
		&genai.GenerateContentConfig{
			Temperature:     genai.Ptr(float32(0.1)),
			MaxOutputTokens: int32(10),
		},
	)
	
	if err != nil {
		logger.Error("Gemini API call failed", zap.Error(err))
		return types.GeminiReturns{
			Result: false,
			Error:  fmt.Errorf("gemini api call failed: %w", err),
		}
	}

	// Check if we have a valid response
	if response == nil || len(response.Candidates) == 0 {
		return types.GeminiReturns{
			Result: false,
			Error:  fmt.Errorf("no candidates returned from Gemini"),
		}
	}

	// Get the response text
	responseText := response.Text()
	logger.Debug("Gemini response", zap.String("response", responseText))

	// Check if the response indicates censored content
	isTrue := responseText == "true"
	return types.GeminiReturns{
		Result: isTrue,
		Error:  nil,
	}
}
