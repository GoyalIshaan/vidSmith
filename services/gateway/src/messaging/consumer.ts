import * as amqp from "amqplib";

import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
  packagingUpdateMessage,
} from "../types/rabbit";
import censorMessageHandler, {
  captionsMessageHandler,
  transcoderMessageHandler,
} from "./handlers";
import {
  RABBITMQ_URL,
  EXCHANGE_NAME,
  EXCHANGE_TYPE,
  CONSUMER_QUEUE_NAME,
  CONSUMER_ROUTING_KEY,
} from "./rabbitArc";

let connection: any;
let channel: amqp.Channel;
let initPromise: Promise<void> | null = null;

async function rabbitInit(): Promise<void> {
  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createConfirmChannel();

  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
    durable: true,
  });

  await channel.assertQueue(CONSUMER_QUEUE_NAME, {
    durable: true,
  });

  await channel.bindQueue(
    CONSUMER_QUEUE_NAME,
    EXCHANGE_NAME,
    CONSUMER_ROUTING_KEY
  );

  console.log("RabbitMQ consumer initialized");
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

export async function startConsuming(): Promise<void> {
  // Wait for initialization to complete before proceeding
  await ensureInitialized();

  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  await channel.consume(
    CONSUMER_QUEUE_NAME,
    async (msg) => {
      if (!msg) {
        console.log("Consumer cancelled by server");
        return;
      }

      try {
        const content = msg.content.toString();
        const messageData = JSON.parse(content);

        console.log(
          "Server Update Received:",
          JSON.stringify(messageData, null, 2)
        );

        await processMessage(messageData);

        channel.ack(msg);
      } catch (error) {
        console.error("Error processing message:", error);

        channel.nack(msg, false, true);
      }
    },
    {
      noAck: false,
    }
  );

  console.log("Consumer started");
}

async function processMessage(messageData: any): Promise<void> {
  const phase = messageData.Phase;
  console.log(`Processing message with phase: ${phase}`);

  if (phase == "censor") {
    console.log("Handling censor message");
    const censorMessage: censorUpdateMessage = messageData;
    await censorMessageHandler(censorMessage);
  } else if (phase == "captions") {
    console.log("Handling captions message");
    const captionsMessage: captionsUpdateMessage = messageData;
    await captionsMessageHandler(captionsMessage);
  } else if (phase == "transcode") {
    console.log("Handling transcode message");
    const transcoderMessage: transcoderUpdateMessage = messageData;
    const result = await transcoderMessageHandler(transcoderMessage);
    console.log("Transcode handler result:", result);
  } else {
    console.warn(`⚠️ Unknown message type received:`, messageData);
  }
}

export async function stopConsuming(): Promise<void> {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
  console.log("🛑 Consumer stopped");
}
