package rabbit

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

// Producer handles publishing messages to RabbitMQ
type Producer struct {
	channel  *amqp.Channel
	exchange string
	logger   *zap.Logger
}

// NewProducer creates a new RabbitMQ producer
func NewProducer(channel *amqp.Channel, logger *zap.Logger) (*Producer, error) {
	exchangeName := "newVideoUploaded"
	exchangeType := "topic"

	// Declare the exchange (should match the consumer)
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

	return &Producer{
		channel:  channel,
		exchange: exchangeName,
		logger:   logger,
	}, nil
}

// PublishUpdateVideoStatus publishes a video status update event
func (p *Producer) PublishUpdateVideoStatus(event types.UpdateVideoStatusEvent) error {
	return p.publishWithRetry("updateVideoStatus", event, 3)
}

// PublishTranscodingComplete publishes a transcoding complete event
func (p *Producer) PublishTranscodingComplete(event types.TranscodingCompleteEvent) error {
	return p.publishWithRetry("transcodingComplete", event, 3)
}

// publishWithRetry publishes a message with retry logic
func (p *Producer) publishWithRetry(topic string, payload interface{}, maxRetries int) error {
	var lastErr error
	
	for attempt := 1; attempt <= maxRetries; attempt++ {
		lastErr = p.publish(topic, payload)
		if lastErr == nil {
			return nil // Success
		}
		
		p.logger.Error("failed to publish message", 
			zap.Error(lastErr), 
			zap.String("topic", topic),
			zap.Int("attempt", attempt),
			zap.Int("maxRetries", maxRetries))
		
		if attempt < maxRetries {
			// Wait before retry (exponential backoff)
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}
	
	return fmt.Errorf("failed to publish %s after %d retries: %w", topic, maxRetries, lastErr)
}

// publish publishes a single message to RabbitMQ
func (p *Producer) publish(topic string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		p.logger.Error("failed to marshal payload", zap.Error(err))
		return fmt.Errorf("marshal payload: %w", err)
	}

	err = p.channel.Publish(
		p.exchange, // exchange
		topic,      // routing key
		false,      // mandatory
		false,      // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)

	if err != nil {
		p.logger.Error("failed to publish message", zap.Error(err), zap.String("topic", topic))
		return fmt.Errorf("publish message: %w", err)
	}

	p.logger.Info("message published", 
		zap.String("exchange", p.exchange), 
		zap.String("topic", topic))
	return nil
}
