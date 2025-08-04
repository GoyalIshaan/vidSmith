package types

type StartPackagingRequest struct {
	VideoId string `json:"VideoId"`
}

type UpdateVideoStatusEvent struct {
	VideoId string `json:"VideoId"`
	ManifestKey string `json:"ManifestKey"`
	DashKey string `json:"DashKey"`
	Phase string `json:"Phase"`
}