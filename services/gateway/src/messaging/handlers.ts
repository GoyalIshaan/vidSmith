import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
} from "../types/rabbit";
import { DB, withDBRetry } from "../db/dbSetup";
import { videosTable } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export default async function censorMessageHandler(
  message: censorUpdateMessage
) {
  const result = await withDBRetry(() =>
    DB.update(videosTable)
      .set({
        censor: message.Censor,
        censorFinished: true,
        updatedAt: new Date(),
      })
      .where(eq(videosTable.id, message.VideoId))
      .returning()
  );

  return result[0];
}

export async function captionsMessageHandler(message: captionsUpdateMessage) {
  console.log("Processing captions message:", JSON.stringify(message, null, 2));

  const updateData: any = {
    captionsFinished: true,
    updatedAt: new Date(),
  };

  // Only set captionsKey if VTTKey is provided and not empty
  if (message.VTTKey && message.VTTKey.trim() !== "") {
    updateData.captionsKey = message.VTTKey;
    console.log("Setting captions key:", message.VTTKey);
  } else {
    updateData.captionsFinished = true;
    updateData.censorFinished = true;
    console.log("Captions failed - no VTT key provided");
  }

  const result = await withDBRetry(() =>
    DB.update(videosTable)
      .set(updateData)
      .where(eq(videosTable.id, message.VideoId))
      .returning()
  );

  console.log("Captions handler result:", result[0]);
  return result[0];
}

export async function transcoderMessageHandler(
  message: transcoderUpdateMessage
) {
  const result = await withDBRetry(() =>
    DB.update(videosTable)
      .set({
        manifestKey: message.ManifestKey,
        thumbnailKey: message.ThumbnailKey,
        videoDuration: message.VideoDuration,
        transcodingFinished: true,
        updatedAt: new Date(),
      })
      .where(eq(videosTable.id, message.VideoId))
      .returning()
  );

  return result[0];
}
