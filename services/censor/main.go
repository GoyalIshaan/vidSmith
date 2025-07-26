package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/internal/config"
	"github.com/GoyalIshaan/vidSmith/tree/master/services/censor/internal/rabbit"
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

	session := session.Must(session.NewSession())
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

	

	rabbitConsumer, err := rabbit.NewConsumer(rabbitChannel, logger, config.BucketName, s3Client, config.GoogleAPIKey)
	if err != nil {
		panic("failed to create RabbitMQ consumer: " + err.Error())
	}

	ctx, cancel := context.WithCancel(context.Background())
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		cancel()
	}()
	
	logger.Info("censor service started, waiting for messages...")
	err = rabbitConsumer.Consume(ctx)
	if err != nil {
		logger.Error("consumer error", zap.Error(err))
	}
}