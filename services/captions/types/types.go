package types

type CaptionsRequest struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
}

type CaptionsReadyEvent struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
	SRTKey      string `json:"srtKey"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"videoId"`
	Phase string `json:"phase"`
	SRTKey string `json:"srtKey"`
}