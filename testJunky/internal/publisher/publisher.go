package publisher

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/streadway/amqp"
)

// CensorRequest matches the structure expected by censor service
type CensorRequest struct {
	VideoId string `json:"VideoId"`
	S3Key   string `json:"S3Key"`
	SRTKey  string `json:"SRTKey"`
}

type RabbitPublisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	exchange string
}

// ConnectToRabbit establishes connection and returns a RabbitPublisher
func ConnectToRabbit() (*RabbitPublisher, error) {
	// Connect to RabbitMQ server
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	// Create a channel
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	exchangeName := "newVideoUploaded"
	
	// Declare the exchange (same as censor service expects)
	err = ch.ExchangeDeclare(
		exchangeName, // name
		"topic",     // type
		true,        // durable
		false,       // auto-deleted
		false,       // internal
		false,       // no-wait
		nil,         // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	return &RabbitPublisher{
		conn:     conn,
		channel:  ch,
		exchange: exchangeName,
	}, nil
}

// PublishCensorRequest publishes a message to the censor service queue
func (p *RabbitPublisher) PublishCensorRequest(ctx context.Context, videoId string, s3Key string, srtKey string) error {
	// Create the message payload
	req := CensorRequest{
		VideoId: videoId,
		S3Key:   s3Key,
		SRTKey:  srtKey,
	}

	// Marshal to JSON
	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	// Publish the message
	err = p.channel.Publish(
		p.exchange,   // exchange
		"startCensor", // routing key (same as censor service expects)
		false,        // mandatory
		false,        // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	fmt.Printf("✅ Published censor request: VideoId=%s, S3Key=%s, SRTKey=%s\n", videoId, s3Key, srtKey)
	return nil
}

// Close closes the connection and channel
func (p *RabbitPublisher) Close() error {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}

// Publisher is the legacy function - keeping for compatibility
func Publisher(ctx context.Context, videoId string, s3Key string, srtKey string) error {
	// Create a one-time publisher
	pub, err := ConnectToRabbit()
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer pub.Close()

	// Publish the message
	return pub.PublishCensorRequest(ctx, videoId, s3Key, srtKey)
}