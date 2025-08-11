package types

type TranscodeRequest struct {
	VideoId    string `json:"videoId"`
	S3Key      string `json:"s3Key"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"VideoId"`
	Phase string `json:"Phase"`	
	MasterManifest string `json:"MasterManifest"`
	ThumbnailLink string `json:"ThumbnailLink"`
	VideoDuration float64 `json:"VideoDuration"`
}