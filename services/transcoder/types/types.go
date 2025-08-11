package types

import (
	"sync"

	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

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

type Producer struct {
	channel  *amqp.Channel
	exchange string
	logger   *zap.Logger
	acks     <-chan amqp.Confirmation
	returns  <-chan amqp.Return
	messageMutex sync.Mutex

}