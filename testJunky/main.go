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
	videoId := "10d3eec5-0454-4807-a5c6-88d473e34e5f"
	s3Key := "god test's those who test's themselves-ElephantsDream.mp4-1753818005020"
	srtKey := "captions/srt/10d3eec5-0454-4807-a5c6-88d473e34e5f.srt"

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