package types

type TranscodeRequest struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"VideoId"`
	Phase string `json:"Phase"`	
}

type TranscodingCompleteEvent struct {
	VideoId string `json:"VideoId"`
}