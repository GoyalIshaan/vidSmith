import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
  packagingUpdateMessage,
} from "../types/rabbit";
import { DB } from "../db/dbSetup";
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
      thumbnailKey: message.ThumbnailKey,
      videoDuration: message.VideoDuration,
      status: sql`${videosTable.status} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  return result[0];
}

export async function packagingMessageHandler(message: packagingUpdateMessage) {
  console.log(
    "Processing packaging message:",
    JSON.stringify(message, null, 2)
  );

  const updateData: any = {
    status: sql`${videosTable.status} + 1`,
    updatedAt: new Date(),
  };

  // Set both manifest keys if provided
  if (message.ManifestKey && message.ManifestKey.trim() !== "") {
    updateData.manifestKey = message.ManifestKey;
    console.log("Setting manifest key:", message.ManifestKey);
  }

  const result = await DB.update(videosTable)
    .set(updateData)
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  console.log("Packaging handler result:", result[0]);
  return result[0];
}
