import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
} from "../types/rabbit";
import { DB } from "../index";
import { videosTable } from "../db/schema";
import { eq } from "drizzle-orm";

export default async function censorMessageHandler(
  message: censorUpdateMessage
) {
  const result = await DB.update(videosTable)
    .set({
      censor: message.Censor,
      updatedAt: new Date(),
    })
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  return result[0];
}

export async function captionsMessageHandler(message: captionsUpdateMessage) {
  const result = await DB.update(videosTable)
    .set({
      captionsKey: message.SRTKey,
      updatedAt: new Date(),
    })
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  return result[0];
}

export async function transcoderMessageHandler(
  message: transcoderUpdateMessage
) {
  const result = await DB.update(videosTable)
    .set({
      manifestKey: message.ManifestKey,
      updatedAt: new Date(),
    })
    .where(eq(videosTable.id, message.VideoId))
    .returning();

  return result[0];
}
