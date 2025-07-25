package types

type TranscodeRequest struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"videoId"`
	Phase string `json:"phase"`
	ManifestKey string `json:"manifestKey"`
}