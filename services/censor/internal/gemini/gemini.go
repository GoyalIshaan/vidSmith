package gemini

import (
	"context"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/types"
	"go.uber.org/zap"
	"google.golang.org/genai"
)

// AskGemini prompts the Gemini model and returns a GeminiReturns struct
func AskGemini(ctx context.Context, prompt string, logger *zap.Logger) types.GeminiReturns {
	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		return types.GeminiReturns{
			Result: false,
			Error:  err,
		}
	}

	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.5-flash",
		genai.Text(prompt),
		nil,
	)
	
	if err != nil {		
		return types.GeminiReturns{
			Result: false,
			Error:  err,
		}
	}

	isTrue := result.Text() == "true"
	return types.GeminiReturns{
		Result: isTrue,
		Error:  nil,
	}
}
