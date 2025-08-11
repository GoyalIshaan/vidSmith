package types

import (
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
}

type TranscodingCompleteEvent struct {
	VideoId string `json:"VideoId"`
}

type Producer struct {
	channel  *amqp.Channel
	exchange string
	logger   *zap.Logger
}