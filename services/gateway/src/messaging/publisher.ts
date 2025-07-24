import * as amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "newVideoUploaded";
const EXCHANGE_TYPE: "fanout" | "topic" = "topic";
const ROUTING_KEY = "videoUploaded";

// How long to wait for an ACK before retrying (in ms)
const CONFIRM_TIMEOUT = 1_000;
// How many times to retry before bubbling up an error
const MAX_RETRIES = 3;

interface VideoUploadedMessage {
  videoId: string;
  s3Key: string;
}

let connection: any;
let confirmChannel: amqp.ConfirmChannel;

async function rabbitInit() {
  connection = await amqp.connect(RABBITMQ_URL);
  confirmChannel = await connection.createConfirmChannel();
  await confirmChannel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
    durable: true,
  });
  console.log(
    `🐇 RabbitMQ: confirm‐channel ready & exchange asserted (${EXCHANGE_NAME})`
  );
}

rabbitInit().catch((err) => {
  console.error("Error initializing RabbitMQ:", err);
  process.exit(1);
});

/**
 * Publish a newVideoUploaded event, waiting up to CONFIRM_TIMEOUT for an ACK.
 * Retries up to MAX_RETRIES times on timeout or NACK.
 */
export async function publishNewVideo(
  msg: VideoUploadedMessage
): Promise<void> {
  if (!confirmChannel) {
    throw new Error("RabbitMQ confirm channel is not initialized");
  }

  const payload = Buffer.from(JSON.stringify(msg));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    confirmChannel.publish(EXCHANGE_NAME, ROUTING_KEY, payload, {
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
