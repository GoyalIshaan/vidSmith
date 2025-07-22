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
	CaptionsJobPrefix string
	CaptionsPrefix string
}

func LoadConfig() (*Config, error) {
	gotenv.Load()

	viper.AutomaticEnv()

	viper.SetDefault("CAPTIONS_PREFIX", "captions/srt")
	viper.SetDefault("CAPTIONS_JOB_PREFIX", "captions/job")

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
		AWSRegion:    viper.GetString("AWS_REGION"),
		CaptionsJobPrefix: viper.GetString("CAPTIONS_JOB_PREFIX"),
		CaptionsPrefix: viper.GetString("CAPTIONS_PREFIX"),
	}
	return cfg, nil
}
