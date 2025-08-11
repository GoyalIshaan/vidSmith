package main

import (
	"context"
	"fmt"
	"log"

	"github.com/GoyalIshaan/vidSmith/testJunky/internal/publisher"
)

func main() {
	ctx := context.Background()

	// Test data for censor service
	videoId := "6d0e3b7e-c8ec-40e2-8e33-afa8049d45d8"
	s3Key := "last test-ElephantsDream.mp4-1754871084799"
	srtKey := "captions/srt/6d0e3b7e-c8ec-40e2-8e33-afa8049d45d8.vtt"

	fmt.Println("🚀 Testing Censor Service Publisher")
	fmt.Printf("📹 VideoId: %s\n", videoId)
	fmt.Printf("📁 S3Key: %s\n", s3Key)
	fmt.Printf("📝 SRTKey: %s\n", srtKey)
	fmt.Println()

	// Connect to RabbitMQ
	fmt.Println("🔌 Connecting to RabbitMQ...")
	pub, err := publisher.ConnectToRabbit()
	if err != nil {
		log.Fatalf("❌ Failed to connect to RabbitMQ: %v", err)
	}
	defer pub.Close()

	fmt.Println("✅ Connected to RabbitMQ successfully!")

	// Publish the censor request
	fmt.Println("📤 Publishing censor request...")
	err = pub.PublishCensorRequest(ctx, videoId, s3Key, srtKey)
	if err != nil {
		log.Fatalf("❌ Failed to publish censor request: %v", err)
	}

	fmt.Println("\n🎉 Message published successfully!")
	fmt.Println("💡 Check your censor service logs to see the received message")
} 