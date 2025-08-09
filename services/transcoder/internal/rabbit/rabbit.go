package rabbit

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/processor"
	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
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
	exchange string
}

func NewConsumer(channel *amqp.Channel, logger *zap.Logger) (*Consumer, error) {
	queueName := "transcodeRequest"
	exchangeName := "newVideoUploaded"
	exchangeType := "topic"
	routingKey := "videoUploaded"

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

	// Set prefetch count to 1 to ensure only one un-acked message is processed at a time
	if err := channel.Qos(prefetchCount, 0, false); err != nil {
		return nil, fmt.Errorf("qos set: %w", err)
	}

	return &Consumer{channel: channel, queue: queueName, logger: logger, exchange: exchangeName}, nil
}

func (c *Consumer) Consume(ctx context.Context, bucketName string, transcodedPrefix string, manifestPrefix string, s3Client *s3.S3, awsSession *session.Session) error {
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
				c.handle(ctx, delivery, bucketName, transcodedPrefix, s3Client, awsSession)
			}(d)
		}
	}
}

func (c *Consumer) handle(ctx context.Context, d amqp.Delivery, bucketName string, transcodedPrefix string, s3Client *s3.S3, awsSession *session.Session) {
	defer func() {
		// Recover from panic and nack the message
		if r := recover(); r != nil {
			c.logger.Error("panic in handle", zap.Any("error", r))
			d.Nack(false, true)
		}
	}()

	var req types.TranscodeRequest
	if err := json.Unmarshal(d.Body, &req); err != nil {
		c.logger.Error("invalid message", zap.Error(err), zap.ByteString("body", d.Body))
		d.Nack(false, false) // discard if bad message
		return
	}

	c.logger.Info("received transcode request", zap.String("videoId", req.VideoId), zap.String("s3Key", req.S3Key))

	// Use the existing s3Client's session instead of creating a new one
	// invoking the transcoding service

	err := processor.Process(ctx, req, bucketName, transcodedPrefix, s3Client, awsSession, c.logger)
	if err != nil {
		c.logger.Error("transcoding failed", zap.Error(err))
		d.Nack(false, true) // requeue for retry
		return
	}

	d.Ack(false)

	updateVideoStatusEvent := types.UpdateVideoStatusEvent{
		VideoId: req.VideoId,
		Phase: "transcode",
	}
	maxRetries := 3
	var emitErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		emitErr = c.emit("updateVideoStatus", updateVideoStatusEvent)
		if emitErr == nil {
			break // Success, exit retry loop
		}
		
		c.logger.Error("failed to publish updateVideoStatus event", 
			zap.Error(emitErr), 
			zap.Int("attempt", attempt),
			zap.Int("maxRetries", maxRetries))
		
		if attempt < maxRetries {
			// Wait before retry (exponential backoff)
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}
	
	transcodingCompleteEvent := types.TranscodingCompleteEvent{
		VideoId: req.VideoId,
	}
	
	if emitErr != nil {
		c.logger.Error("failed to publish updateVideoStatus event after all retries", 
			zap.Error(emitErr), 
			zap.String("videoId", req.VideoId))
	}

	emitErr = nil
	for attempt := 1; attempt <= maxRetries; attempt++ {
		emitErr = c.emit("transcodingComplete", transcodingCompleteEvent)
		if emitErr == nil {
			break // Success, exit retry loop
		}
		
		c.logger.Error("failed to publish transcodingComplete event", 
			zap.Error(emitErr), 
			zap.Int("attempt", attempt),
			zap.Int("maxRetries", maxRetries))
		
		if attempt < maxRetries {
			// Wait before retry (exponential backoff)
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}

	if emitErr != nil {
		c.logger.Error("failed to publish transcodingComplete event after all retries", 
			zap.Error(emitErr), 
			zap.String("videoId", req.VideoId))
	}

	c.logger.Info("transcode request completed", zap.String("videoId", req.VideoId))
}

func (c *Consumer) emit(topic string, payload interface{}) error {
	body, err := json.Marshal(payload)
    if err != nil {
        c.logger.Error("failed to marshal payload", zap.Error(err))
        return err
    }

    var publishingError error
    switch topic {
		case "updateVideoStatus": {
			publishingError = c.channel.Publish(
    	        c.exchange, // exchange
    	        topic,      // routing key
    	        false,      // mandatory
    	        false,      // immediate
				amqp.Publishing{
					ContentType: "application/json",
					Body: body,
				},
			)
			break
		}
		case "transcodingComplete": {
			publishingError = c.channel.Publish(
    	        c.exchange, // exchange
    	        topic,      // routing key
    	        false,      // mandatory
    	        false,      // immediate
				amqp.Publishing{
					ContentType: "application/json",
					Body: body,
				},
			)
			break
		}
		default:
        // handle other topics if needed
    }

    if publishingError != nil {
        c.logger.Error("failed to publish message", zap.Error(publishingError), zap.String("topic", topic))
        return publishingError
    }
    c.logger.Info("message published", zap.String("exchange", c.exchange), zap.String("topic", topic))
    return nil
}