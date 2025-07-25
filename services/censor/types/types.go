package types

type CensorRequest struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
	SRTKey      string `json:"srtKey"`
}

type GeminiReturns struct {
	Result bool  `json:"result"`
	Error  error `json:"error"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"videoId"`
	Phase string `json:"phase"`
	Censor bool `json:"censor"`
}