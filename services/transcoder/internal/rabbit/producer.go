package rabbit

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/types"
	"github.com/google/uuid"
	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

var GlobalProducer *Producer

// Producer handles publishing messages to RabbitMQ
type Producer struct {
	channel  *amqp.Channel
	exchange string
	logger   *zap.Logger
	acks     <-chan amqp.Confirmation
	returns  <-chan amqp.Return
	messageMutex sync.Mutex
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
	
	if err := channel.Confirm(false); err != nil {
		return nil, fmt.Errorf("enable confirm: %w", err)
	}

	acks := channel.NotifyPublish(make(chan amqp.Confirmation, 1))
	returns := channel.NotifyReturn(make(chan amqp.Return, 1))

	return &Producer{
		channel:  channel,
		exchange: exchangeName,
		logger:   logger,
		acks:     acks,
		returns:  returns,
		messageMutex: sync.Mutex{},
	}, nil
}

// PublishUpdateVideoStatus publishes a video status update event
func (p *Producer) PublishUpdateVideoStatus(event types.UpdateVideoStatusEvent) error {
	return p.publishWithRetry("updateVideoStatus", event, 3)
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

	pub := amqp.Publishing{
		ContentType: "application/json",
		MessageId:   uuid.New().String(),
		Timestamp:   time.Now(),
		Body:        body,
	}

	p.messageMutex.Lock()
	defer p.messageMutex.Unlock()

	if err = p.channel.Publish(
		p.exchange, // exchange
		topic,      // routing key
		true,      // mandatory
		false,      // immediate
		pub,
	); 
	err != nil {
		p.logger.Error("failed to publish message", zap.Error(err), zap.String("topic", topic))
		return fmt.Errorf("publish message: %w", err)
	}

	p.logger.Info("message published", 
		zap.String("exchange", p.exchange), 
		zap.String("topic", topic))
	return nil
}


func (p *Producer) HandleConfirmations(ctx context.Context) {
	p.logger.Info("starting confirmation handler")
    for {
        select {
        case ack, ok := <-p.acks: {
			if !ok {
                p.logger.Error("acks channel closed")
                break
            }
            // Handle ack/nack...
            if ack.Ack {
                p.logger.Info("message confirmed", zap.Uint64("deliveryTag", ack.DeliveryTag))
            } else {
                p.logger.Error("message nacked", zap.Uint64("deliveryTag", ack.DeliveryTag))
            }
		}

        case ret, ok := <-p.returns: {
			if !ok {
                p.logger.Error("returns channel closed")
                break
            }

            // The broker could not route the message. Log it and decide what to do.
            p.logger.Error("message returned from broker", 
                zap.String("replyText", ret.ReplyText),
                zap.ByteString("body", ret.Body),
            )
		}
		case <-ctx.Done(): {
			p.logger.Info("confirmation handler stopped")
			return
		}
        }
    }
}