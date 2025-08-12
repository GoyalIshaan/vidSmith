package types

type CensorRequest struct {
	VideoId    string `json:"VideoId"`
	S3Key      string `json:"S3Key"`
	VTTKey      string `json:"VTTKey"`
}

type GeminiReturns struct {
	Result bool  `json:"result"`
	Error  error `json:"error"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"VideoId"`
	Phase string `json:"Phase"`
	Censor bool `json:"Censor"`
}