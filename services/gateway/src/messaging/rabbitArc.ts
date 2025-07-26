export const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
export const EXCHANGE_NAME = "newVideoUploaded";
export const EXCHANGE_TYPE: "fanout" | "topic" = "topic";

export const PUBLISHER_ROUTING_KEY = "videoUploaded";

export const CONSUMER_QUEUE_NAME = "gateway-video-status-queue";
export const CONSUMER_ROUTING_KEY = "updateVideoStatus";
