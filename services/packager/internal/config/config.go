package config

import (
	"fmt"

	"github.com/spf13/viper"
	"github.com/subosito/gotenv"
)

type Config struct {
	AmqpURL     string
	BucketName string
	AWSRegion   string
	TranscodedPrefix   string
	PackagedPrefix string
	CDNBaseURL string
}

func LoadConfig() (*Config, error) {
	gotenv.Load()

	viper.AutomaticEnv()

	// Required keys
	required := []string{
		"AMQP_URL",
		"BUCKET_NAME",
		"AWS_REGION",
		"TRANSCODED_PREFIX",
		"PACKAGED_PREFIX",
		"CDN_BASE_URL",
	}

	for _, key := range required {
		if !viper.IsSet(key) {
			return nil, fmt.Errorf("environment variable %s is required", key)
		}
	}

	cfg := &Config{
		AmqpURL:      viper.GetString("AMQP_URL"),
		BucketName:   viper.GetString("BUCKET_NAME"),
		AWSRegion:    viper.GetString("AWS_REGION"),
		TranscodedPrefix:    viper.GetString("TRANSCODED_PREFIX"),
		PackagedPrefix: viper.GetString("PACKAGED_PREFIX"),
		CDNBaseURL: viper.GetString("CDN_BASE_URL"),
	}
	return cfg, nil
}
