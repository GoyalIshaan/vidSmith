package gemini

import (
	"fmt"
	"strings"
)

func BuildPrompt(srtChunk string, censoredWords []string) string {
	return fmt.Sprintf(`You are a content moderation AI. Here is a list of censored words: %s. Here is a chunk of an SRT subtitle file: """
%s
"""
If any of the censored words appear in the SRT chunk, reply with "true". If none appear, reply with "false". Reply with only "true" or "false".`,
		strings.Join(censoredWords, ", "), srtChunk)
}
