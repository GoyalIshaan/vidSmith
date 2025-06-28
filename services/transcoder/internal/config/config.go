package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config holds all configuration required by the transcoder service
type Config struct {
	// AMQP (RabbitMQ) connection URL
	AmqpURL     string

	// S3 bucket name
	BucketName string

	// Prefix
	OriginalPrefix string
	TranscodedPrefix string
	ManifestPrefix string

	// AWS region for S3 operations
	AWSRegion   string
	// Path to the ffmpeg binary
	FfmpegPath  string
}

// LoadConfig reads configuration from environment variables (via Viper)
func LoadConfig() (*Config, error) {
	viper.AutomaticEnv()

	// Defaults
	viper.SetDefault("FFMPEG_PATH", "ffmpeg")
	viper.SetDefault("ORIGINAL_PREFIX", "uploads/originals")
	viper.SetDefault("TRANSCODED_PREFIX", "transcoded")
	viper.SetDefault("MANIFEST_PREFIX", "manifests")

	// Required keys
	required := []string{
		"AMQP_URL",
		"BUCKET_NAME",
		"AWS_REGION",
	}
	for _, key := range required {
		if !viper.IsSet(key) {
			return nil, fmt.Errorf("environment variable %s is required", key)
		}
	}

	cfg := &Config{
		AmqpURL:      viper.GetString("AMQP_URL"),
		BucketName:   viper.GetString("BUCKET_NAME"),
		OriginalPrefix: viper.GetString("ORIGINAL_PREFIX"),
		TranscodedPrefix: viper.GetString("TRANSCODED_PREFIX"),
		ManifestPrefix: viper.GetString("MANIFEST_PREFIX"),
		AWSRegion:    viper.GetString("AWS_REGION"),
		FfmpegPath:   viper.GetString("FFMPEG_PATH"),
	}
	return cfg, nil
}
