package rabbit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/processor"
	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/types"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

const prefetchCount = 5

type Consumer struct {
	channel *amqp.Channel
	queue   string
	exchange string
	logger  *zap.Logger
	bucketName string
	s3Client *s3.S3
	googleAPIKey string
}

func NewConsumer(
	channel *amqp.Channel, 
	logger *zap.Logger,
	bucketName string,
	s3Client *s3.S3,
	googleAPIKey string,
) (*Consumer, error) {
	queueName := "censorRequest"
	exchangeName := "newVideoUploaded"
	exchangeType := "topic"
	routingKey := "startCensor"

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

	return &Consumer{
		channel: channel, 
		queue: queueName, 
		exchange: exchangeName,
		logger: logger,
		bucketName: bucketName,		
		s3Client: s3Client,
		googleAPIKey: googleAPIKey,
		}, nil
}

func (c *Consumer) Consume(ctx context.Context, producer *Producer) error {
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
		case <- ctx.Done():
			return nil
		case d, ok := <-msgs:
			if !ok {
				return nil // channel closed
			}

			// Acquire semaphore slot
			semaphore <- struct{}{}

			go func(delivery amqp.Delivery) {
				defer func() { <-semaphore }() // Release semaphore slot
				c.handle(ctx, delivery, producer)
			}(d)
		}
	}
}

func (c *Consumer) handle(ctx context.Context, d amqp.Delivery, producer *Producer) {
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
	var req types.CensorRequest
	if err := json.Unmarshal(d.Body, &req); err != nil {
		c.logger.Error("invalid message", zap.Error(err), zap.ByteString("body", d.Body))
		d.Nack(false, false) // discard bad message
		return
	}

	c.logger.Info("received censor request", zap.String("videoId", req.VideoId), zap.String("s3Key", req.S3Key), zap.String("vttKey", req.VTTKey))

	// Validate that we have a valid SRT key (captions must be completed first)
	if req.VTTKey == "" {
		c.logger.Info("videoId: " + req.VideoId + " has no captions")
		d.Ack(false)
		return
	}

	// Use the existing s3Client's session instead of creating a new one
	// invoking the censoring services
	result, err := processor.Process(ctx, c.bucketName, req.VTTKey, c.s3Client, c.googleAPIKey, c.logger)
	if err !=nil {
		c.logger.Error("censoring failed", zap.Error(err))
		d.Nack(false, true) // requeue for retry
		return
	}

	// Acknowledge the original processing as successful
	d.Ack(false)

	event := types.UpdateVideoStatusEvent{
		VideoId: req.VideoId,
		Phase: "censor",
		Censor: result,
	}

	producer.PublishUpdateVideoStatus(event)

	c.logger.Info("censor request completed", zap.String("videoId", req.VideoId))
}

