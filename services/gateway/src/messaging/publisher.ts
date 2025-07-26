import * as amqp from "amqplib";
import {
  RABBITMQ_URL,
  EXCHANGE_NAME,
  EXCHANGE_TYPE,
  PUBLISHER_ROUTING_KEY,
} from "./rabbitArc";

const CONFIRM_TIMEOUT = 1_000;
const MAX_RETRIES = 3;

interface VideoUploadedMessage {
  videoId: string;
  s3Key: string;
}

let connection: any;
let confirmChannel: amqp.ConfirmChannel;
let initPromise: Promise<void> | null = null;

async function rabbitInit(): Promise<void> {
  connection = await amqp.connect(RABBITMQ_URL);
  confirmChannel = await connection.createConfirmChannel();
  await confirmChannel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
    durable: true,
  });
  console.log("RabbitMQ publisher initialized");
}

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = rabbitInit().catch((err) => {
      console.error("Error initializing RabbitMQ:", err);
      process.exit(1);
    });
  }
  return initPromise;
}

// Start initialization immediately
ensureInitialized();

export async function publishNewVideo(
  msg: VideoUploadedMessage
): Promise<void> {
  // Wait for initialization to complete before proceeding
  await ensureInitialized();

  if (!confirmChannel) {
    throw new Error("RabbitMQ confirm channel is not initialized");
  }

  const payload = Buffer.from(JSON.stringify(msg));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    confirmChannel.publish(EXCHANGE_NAME, PUBLISHER_ROUTING_KEY, payload, {
      persistent: true,
    });

    try {
      // waitForConfirms resolves when all publishes so far are ACKed
      await Promise.race([
        confirmChannel.waitForConfirms(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("Confirm timeout")), CONFIRM_TIMEOUT)
        ),
      ]);

      return;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw err;
      }
    }
  }
}
