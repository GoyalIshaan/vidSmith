package types

type TranscodeRequest struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
}