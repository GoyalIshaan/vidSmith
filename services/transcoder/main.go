package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/GoyalIshaan/vidSmith/services/transcoder/internal/config"
	"github.com/GoyalIshaan/vidSmith/services/transcoder/internal/rabbit"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/streadway/amqp"
	"go.uber.org/zap"
)

func main() {
	config, err := config.LoadConfig()
	if err != nil {
		panic("config: " + err.Error())
	}

	logger, _ := zap.NewProduction()
	defer logger.Sync()

	session := session.Must(session.NewSession(&aws.Config{
		Region: aws.String(config.AWSRegion),
	}))
	s3Client := s3.New(session)

	rabbitConnection, err := amqp.Dial(config.AmqpURL)
	if err != nil {
		panic("failed to connect to RabbitMQ: " + err.Error())
	}
	defer rabbitConnection.Close()

	rabbitChannel, err := rabbitConnection.Channel()
	if err != nil {
		panic("failed to open RabbitMQ channel: " + err.Error())
	}
	defer rabbitChannel.Close()

	rabbitConsumer, err := rabbit.NewConsumer(rabbitChannel, logger)
	if err != nil {
		panic("failed to create RabbitMQ consumer: " + err.Error())
	}

	rabbit.GlobalProducer, err = rabbit.NewProducer(rabbitChannel, logger)
	if err != nil {
		panic("failed to create RabbitMQ producer: " + err.Error())
	}

	// Start HTTP server for health checks
	go func() {
		http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
			if rabbitConnection.IsClosed() {
				http.Error(w, "RabbitMQ connection closed", http.StatusServiceUnavailable)
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("ready"))
		})

		http.HandleFunc("/live", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("alive"))
		})

		logger.Info("Starting HTTP server for health checks", zap.String("port", "4000"))
		if err := http.ListenAndServe(":4000", nil); err != nil {
			logger.Error("HTTP server error", zap.Error(err))
		}
	}()

	ctx, cancel := context.WithCancel(context.Background())
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		cancel()
	}()
	
	logger.Info("transcoder service started, waiting for messages...")
	err = rabbitConsumer.Consume(ctx, config.BucketName, config.TranscodedPrefix, config.ManifestPrefix, s3Client, session)
	if err != nil {
		logger.Error("consumer error", zap.Error(err))
	}

	go rabbit.GlobalProducer.HandleConfirmations(ctx)
}