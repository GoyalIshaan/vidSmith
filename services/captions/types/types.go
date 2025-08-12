package types

type CaptionsRequest struct {
	VideoId    string `json:"VideoId"`
	S3Key      string `json:"S3Key"`
}

type CaptionsReadyEvent struct {
	VideoId    string `json:"VideoId"`
	S3Key      string `json:"S3Key"`
	VTTKey      string `json:"VTTKey"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"VideoId"`
	Phase string `json:"Phase"`
	VTTKey string `json:"VTTKey"`
}