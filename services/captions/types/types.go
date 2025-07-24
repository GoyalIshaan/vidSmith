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