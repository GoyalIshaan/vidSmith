package rabbit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/captions/processor"
	"github.com/GoyalIshaan/vidSmith/tree/master/services/captions/types"
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
	queueName := "captionsRequest"
	exchangeName := "newVideoUploaded"
	exchangeType := "topic"
	routingKey := "captionsRequest"

	// Declare the exchange (same as gateway)
	if err := channel.ExchangeDeclare(
		exchangeName,
		exchangeType,
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,   // arguments
	); err != nil {
		return nil, fmt.Errorf("exchange declare: %w", err)
	}

	// Declare the queue
	if _, err := channel.QueueDeclare(
		queueName,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	); err != nil {
		return nil, err
	}

	// Bind the queue to the exchange with the routing key
	if err := channel.QueueBind(
		queueName,
		routingKey,
		exchangeName,
		false, // no-wait
		nil,   // arguments
	); err != nil {
		return nil, fmt.Errorf("queue bind: %w", err)
	}

	// sets the prefetch count
	if err := channel.Qos(prefetchCount, 0, false); err != nil {
		return nil, fmt.Errorf("qos set: %w", err)
	}

	return &Consumer{channel: channel, queue: queueName, logger: logger}, nil
}

func (c *Consumer) Consume(ctx context.Context, bucketName, captionsPrefix, transcriberJobPrefix string, s3Client *s3.S3, awsSession *session.Session) error {
	msgs, err := c.channel.Consume(
		c.queue,
		"",    // consumer tag
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // arguments
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
				c.handle(ctx, delivery, bucketName, captionsPrefix, transcriberJobPrefix, s3Client, awsSession)
			}(d)
		}
	}
}

func (c *Consumer) handle(ctx context.Context, d amqp.Delivery, bucketName, captionsPrefix, transcriberJobPrefix string, s3Client *s3.S3, awsSession *session.Session) {
	// TODO: Implement message handling logic
	defer func() {
		// Recover from panic and nack the message
		if r := recover(); r != nil {
			c.logger.Error("panic in handle", zap.Any("error", r))
			d.Nack(false, true)
		}
	}()

	// TODO: Change this
	// Unmarshal the message body into a TranscodeRequest struct
	var req types.CaptionsRequest
	if err := json.Unmarshal(d.Body, &req); err != nil {
		c.logger.Error("invalid message", zap.Error(err), zap.ByteString("body", d.Body))
		d.Nack(false, false) // discard bad message
		return
	}

	c.logger.Info("received transcode request", zap.String("videoId", req.VideoId), zap.String("s3Key", req.S3Key))

	// Use the existing s3Client's session instead of creating a new one
	// invoking the transcoding service
	if err := processor.Process(ctx, req, bucketName, captionsPrefix, transcriberJobPrefix, s3Client, awsSession, c.logger); err !=nil {

	}

	d.Ack(false)
	c.logger.Info("transcode request completed", zap.String("videoId", req.VideoId))
}
