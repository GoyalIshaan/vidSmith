package types

type CaptionsRequest struct {
	VideoId    string `json:"VideoId"`
	S3Key      string `json:"S3Key"`
}

type CaptionsReadyEvent struct {
	VideoId    string `json:"VideoId"`
	S3Key      string `json:"S3Key"`
	SRTKey      string `json:"SRTKey"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"VideoId"`
	Phase string `json:"Phase"`
	SRTKey string `json:"SRTKey"`
}