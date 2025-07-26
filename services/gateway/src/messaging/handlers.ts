import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
} from "../types/rabbit";
import { DB } from "../index";
import { videosTable } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export default async function censorMessageHandler(
  message: censorUpdateMessage
) {
  const result = await DB.update(videosTable)
    .set({
      censor: message.Censor,
      status: sql`${videosTable.status} + 3`,
      updatedAt: new Date(),
    })
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  return result[0];
}

export async function captionsMessageHandler(message: captionsUpdateMessage) {
  console.log("Processing captions message:", JSON.stringify(message, null, 2));

  const updateData: any = {
    status: sql`${videosTable.status} + 2`,
    updatedAt: new Date(),
  };

  // Only set captionsKey if SRTKey is provided and not empty
  if (message.SRTKey && message.SRTKey.trim() !== "") {
    updateData.captionsKey = message.SRTKey;
    console.log("Setting captions key:", message.SRTKey);
  } else {
    console.log("Captions failed - no SRT key provided");
  }

  const result = await DB.update(videosTable)
    .set(updateData)
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  console.log("Captions handler result:", result[0]);
  return result[0];
}

export async function transcoderMessageHandler(
  message: transcoderUpdateMessage
) {
  const result = await DB.update(videosTable)
    .set({
      manifestKey: message.ManifestKey,
      status: sql`${videosTable.status} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  return result[0];
}
