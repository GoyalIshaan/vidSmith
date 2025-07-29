package rabbit

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/captions/processor"
	"github.com/GoyalIshaan/vidSmith/tree/master/services/captions/types"
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
	captionsPrefix string
	transcriberJobPrefix string
	s3Client *s3.S3
}

func NewConsumer(
	channel *amqp.Channel, 
	logger *zap.Logger,
	bucketName, captionsPrefix, transcriberJobPrefix string,
	s3Client *s3.S3,
) (*Consumer, error) {
	queueName := "captionsRequest"
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
		captionsPrefix: captionsPrefix,
		transcriberJobPrefix: transcriberJobPrefix,
		s3Client: s3Client,
		}, nil
}

func (c *Consumer) Consume(ctx context.Context) error {
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
				c.handle(ctx, delivery)
			}(d)
		}
	}
}

func (c *Consumer) handle(ctx context.Context, d amqp.Delivery) {	
	defer func() {
		// Recover from panic and nack the message
		if r := recover(); r != nil {
			c.logger.Error("panic in handle", zap.Any("error", r))
			d.Nack(false, true)
		}
	}()
	
	var req types.CaptionsRequest
	if err := json.Unmarshal(d.Body, &req); err != nil {
		c.logger.Error("invalid message", zap.Error(err), zap.ByteString("body", d.Body))
		d.Nack(false, false) // discard bad message
		return
	}

	c.logger.Info("received captions request", zap.String("videoId", req.VideoId), zap.String("s3Key", req.S3Key))

	srtKey := fmt.Sprintf("%s/%s.srt", c.captionsPrefix, req.VideoId)


	if err := processor.Process(ctx, req, c.bucketName, c.captionsPrefix, c.transcriberJobPrefix, c.s3Client, c.logger); err != nil {
		c.logger.Error("captions processing failed", zap.Error(err), zap.String("videoId", req.VideoId))
		
		d.Nack(false, true)
		return
	}

	d.Ack(false)

	startCensorEvent := types.CaptionsReadyEvent{
		VideoId: req.VideoId,
		SRTKey: srtKey,
		S3Key: req.S3Key,
	}

	maxRetries := 3
	var emitErr error
	
	for attempt := 1; attempt <= maxRetries; attempt++ {
		emitErr = c.emit("startCensor", startCensorEvent)
		if emitErr == nil {
			break // Success, exit retry loop
		}
		
		c.logger.Error("failed to publish startCensor event", 
			zap.Error(emitErr), 
			zap.Int("attempt", attempt),
			zap.Int("maxRetries", maxRetries))
		
		if attempt < maxRetries {
			// Wait before retry (exponential backoff)
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}
	
	if emitErr != nil {
		c.logger.Error("failed to publish startCensor event after all retries", 
			zap.Error(emitErr), 
			zap.String("videoId", req.VideoId))
	}


	updateVideoStatusEvent := types.UpdateVideoStatusEvent{
		VideoId: req.VideoId,
		Phase: "captions",
		SRTKey: srtKey, // Set even if failed, so UI can show partial state
	}

	emitErr = nil
	for attempt := 1; attempt <= maxRetries; attempt++ {
		emitErr = c.emit("updateVideoStatus", updateVideoStatusEvent)
		if emitErr == nil {
			break
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
	
	if emitErr != nil {
		c.logger.Error("failed to publish updateVideoStatus event after all retries", 
			zap.Error(emitErr), 
			zap.String("videoId", req.VideoId))
	}

}

func (c *Consumer) emit(topic string, payload interface{}) error {
	body, err := json.Marshal(payload)
    if err != nil {
        c.logger.Error("failed to marshal payload", zap.Error(err))
        return err
    }

    var publishingError error
    switch topic {
		case "startCensor": {
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