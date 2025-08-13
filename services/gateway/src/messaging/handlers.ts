import type {
  censorUpdateMessage,
  captionsUpdateMessage,
  transcoderUpdateMessage,
} from "../types/rabbit";
import { DB, withDBRetry } from "../db/dbSetup";
import { videosTable } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { s3Client } from "../aws/s3Client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

function deleteOriginalFileIfProcessingComplete(videoId: string) {
  // Fire and forget - start the async operation but don't wait for it
  (async () => {
    try {
      // Get the current video data to check processing status
      const video = await withDBRetry(() =>
        DB.select()
          .from(videosTable)
          .where(eq(videosTable.id, videoId))
          .limit(1)
      );

      if (!video.length) {
        console.log(`❌ Video ${videoId} not found in database`);
        return;
      }

      const videoData = video[0];

      // Check if both captions and transcoding are finished
      if (videoData.captionsFinished && videoData.transcodingFinished) {
        console.log(
          `🗑️ Both captions and transcoding finished for ${videoId}, deleting original file`
        );

        if (!videoData.s3Key) {
          console.log(
            `⚠️ No s3Key found for video ${videoId}, skipping deletion`
          );
          return;
        }

        // Delete the original file from S3
        const bucketName =
          process.env.AWS_BUCKET_NAME || process.env.BUCKET_NAME;
        if (!bucketName) {
          console.error(
            "❌ No bucket name configured in environment variables"
          );
          return;
        }

        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: videoData.s3Key,
        });

        await s3Client.send(deleteCommand);
        console.log(
          `✅ Successfully deleted original file: ${videoData.s3Key} from bucket: ${bucketName}`
        );
      } else {
        console.log(
          `⏳ Video ${videoId} processing not complete yet - Captions: ${videoData.captionsFinished}, Transcoding: ${videoData.transcodingFinished}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Error deleting original file for video ${videoId}:`,
        error
      );
      // Don't throw the error - we don't want to fail the main processing if cleanup fails
    }
  })(); // Immediately invoke the async function

  // Return immediately without waiting for the deletion to complete
  console.log(`🔥 Started background deletion check for video ${videoId}`);
}

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

  // Check if we should delete the original file now that captions are done (fire and forget)
  deleteOriginalFileIfProcessingComplete(message.VideoId);

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

  // Check if we should delete the original file now that transcoding is done (fire and forget)
  deleteOriginalFileIfProcessingComplete(message.VideoId);

  return result[0];
}
