import * as amqp from "amqplib";

import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
} from "../types/rabbit";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "newVideoUploaded";
const EXCHANGE_TYPE: "fanout" | "topic" = "topic";
const QUEUE_NAME = "gateway-video-status-queue";
const ROUTING_KEY = "updateVideoStatus";

let connection: any;
let channel: amqp.Channel;
let initPromise: Promise<void> | null = null;

async function rabbitInit(): Promise<void> {
  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  // Assert the exchange
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
    durable: true,
  });

  // Assert the queue
  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
  });

  // Bind the queue to the exchange with the routing key
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  console.log(
    `🐇 RabbitMQ: Consumer ready & listening on queue ${QUEUE_NAME} for routing key ${ROUTING_KEY}`
  );
}

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = rabbitInit().catch((err) => {
      console.error("Error initializing RabbitMQ consumer:", err);
      process.exit(1);
    });
  }
  return initPromise;
}

// Start initialization immediately
ensureInitialized();

/**
 * Start consuming messages from the updateVideoStatus topic indefinitely
 */
export async function startConsuming(): Promise<void> {
  // Wait for initialization to complete
  await ensureInitialized();

  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  // Set up consumer with acknowledgment
  await channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (!msg) {
        console.log("Consumer cancelled by server");
        return;
      }

      try {
        // Parse the message
        const content = msg.content.toString();
        const messageData = JSON.parse(content);

        console.log("Server Update Received");

        // Hand off to separate processing function based on message type
        await processMessage(messageData);

        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error("Error processing message:", error);

        // Reject the message and requeue it
        // This will cause the message to be redelivered
        channel.nack(msg, false, true);
      }
    },
    {
      // Enable manual acknowledgment
      noAck: false,
    }
  );

  console.log(
    `🎧 Consumer started - listening for ${ROUTING_KEY} messages indefinitely`
  );
}

/**
 * Separate function to process different types of messages
 * This is where you implement your business logic
 */
async function processMessage(messageData: any): Promise<void> {
  // Determine message type based on the properties present
  const phase = messageData.phase;
  if (phase == "censor") {
    // This is a censor update message
    const censorMessage: censorUpdateMessage = messageData;

    // Add your censor processing logic here
    // e.g., update database with censor status
  } else if (phase == "captions") {
    // This is a captions update message
    const captionsMessage: captionsUpdateMessage = messageData;
    console.log(
      `📝 Captions update for video ${captionsMessage.VideoId}: SRT file at ${captionsMessage.SRTKey}`
    );

    // Add your captions processing logic here
    // e.g., update database with captions SRT key
  } else if (phase == "transcode") {
    // This is a transcoder update message
    const transcoderMessage: transcoderUpdateMessage = messageData;
    console.log(
      `🎬 Transcoder update for video ${transcoderMessage.VideoId}: Manifest at ${transcoderMessage.ManifestKey}`
    );

    // Add your transcoder processing logic here
    // e.g., update database with manifest key, mark video as ready
  } else {
    console.warn(`⚠️ Unknown message type received:`, messageData);
  }
}

/**
 * Stop consuming messages and close the connection
 */
export async function stopConsuming(): Promise<void> {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
  console.log("🛑 Consumer stopped");
}
