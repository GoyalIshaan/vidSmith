package rabbit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/processor"
	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

const prefetchCount = 5
type Consumer struct {
	channel *amqp.Channel
	queue   string
	logger  *zap.Logger
}

func NewConsumer(channel *amqp.Channel, logger *zap.Logger) (*Consumer, error) {
	queueName := "transcodeRequest"

	if _, err := channel.QueueDeclare(
		queueName,
		true, // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil, // arguments
	); err != nil {
		return nil, err
	}

	// Set prefetch count to 1 to ensure only one un-acked message is processed at a time
	if err := channel.Qos(prefetchCount, 0, false); err != nil {
		return nil, fmt.Errorf("qos set: %w", err)
	}
	
	return &Consumer{channel: channel, queue: queueName, logger: logger}, nil
}

func (c *Consumer) Consume(ctx context.Context, bucketName string, transcodedPrefix string, manifestPrefix string, s3Client *s3.S3) error {
	msgs, err := c.channel.Consume(
		c.queue,
		"", // consumer tag
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil, // arguments
	)

	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	// Semaphore to limit concurrent goroutines
	semaphore := make(chan struct{}, prefetchCount)

	for {
    select {
    case <-ctx.Done():
      return nil
    case d, ok := <-msgs:
      if !ok {
        return nil // channel closed
      }
      
      // Acquire semaphore slot
      semaphore <- struct{}{}
      
      go func(delivery amqp.Delivery) {
        defer func() { <-semaphore }() // Release semaphore slot
        c.handle(ctx, delivery, bucketName, transcodedPrefix, manifestPrefix, s3Client)
      }(d)
    }
  }
}

func (c *Consumer) handle(ctx context.Context, d amqp.Delivery, bucketName string, transcodedPrefix string, manifestPrefix string, s3Client *s3.S3) {
	// TODO: Implement message handling logic
	defer func() {
		// Recover from panic and nack the message
		if r := recover(); r != nil {
			c.logger.Error("panic in handle", zap.Any("error", r))
			d.Nack(false, true)
		}
	}()

	// Unmarshal the message body into a TranscodeRequest struct
	var req types.TranscodeRequest
	if err := json.Unmarshal(d.Body, &req); err != nil {
		c.logger.Error("invalid message", zap.Error(err), zap.ByteString("body", d.Body))
		d.Nack(false, false) // discard bad message
		return
	}

	c.logger.Info("received transcode request", zap.String("videoId", req.VideoId), zap.String("s3Key", req.S3Key))

	// create an AWS session
	session, err := session.NewSession(&aws.Config{
		Region: s3Client.Config.Region,
	})

	if err != nil {
        c.logger.Error("failed to create AWS session", zap.Error(err))
        d.Nack(false, true) // transient error
        return
    }

	// invoking the transcoding service

	if err := processor.Process(ctx, req, bucketName, transcodedPrefix, manifestPrefix, s3Client, session); err != nil {
		c.logger.Error("transcoding failed", zap.Error(err))
        d.Nack(false, true) // requeue for retry
        return
	}

	d.Ack(false)
    c.logger.Info("transcode request completed", zap.String("videoId", req.VideoId))
}