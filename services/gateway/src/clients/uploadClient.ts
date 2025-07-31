import { DB } from "../db/dbSetup";
import { videosTable } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  type CompletedPart,
  AbortMultipartUploadCommand,
  type CreateMultipartUploadCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../aws/s3Client";
import { publishNewVideo } from "../messaging/publisher";

export class UploadClient {
  async initiateMultipartUpload(
    videoName: string,
    fileName: string,
    contentType: string,
    size: number
  ) {
    if (size < 0) {
      throw new Error("Size must be greater than 0");
    }

    const s3Key = `${videoName}-${fileName}-${Date.now()}`;

    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `originals/${s3Key}`,
        ContentType: contentType,
        ACL: "private",
      });

      const response: CreateMultipartUploadCommandOutput =
        await s3Client.send(command);

      const [video] = await DB.insert(videosTable)
        .values({
          videoName,
          s3Key,
          status: 0,
        })
        .returning();

      return {
        uploadId: response.UploadId,
        videoDBID: video.id,
        key: s3Key,
      };
    } catch (error) {
      console.error("❌ Upload initiation failed:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to initiate upload: ${error.message}`);
      }
      throw new Error("Failed to initiate upload");
    }
  }

  // Generate a presigned URL for a single part of a multipart upload
  async generateUploadPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number = 3600
  ) {
    const command = new UploadPartCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `originals/${key}`,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresIn,
    });

    return presignedUrl;
  }

  // Complete a multipart upload
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    videoDBID: string,
    parts: Array<{ ETag: string; PartNumber: number }>
  ) {
    // S3 requires that the array of parts be sorted by PartNumber ascending.
    const sortedParts: CompletedPart[] = parts
      .map((p) => ({ ETag: p.ETag, PartNumber: p.PartNumber }))
      .sort((a, b) => a.PartNumber - b.PartNumber);

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `originals/${key}`,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    });

    const response = await s3Client.send(command);

    const [videoDetailsInDB] = await DB.update(videosTable)
      .set({
        status: 0,
        bucketName: response.Bucket!,
      })
      .where(eq(videosTable.id, videoDBID))
      .returning();

    await publishNewVideo({
      videoId: videoDetailsInDB.id,
      s3Key: videoDetailsInDB.s3Key,
    });

    return {
      videoDBID: videoDetailsInDB.id,
      bucketName: response.Bucket!,
      status: videoDetailsInDB.status,
    };
  }

  async abortMultipartUpload(key: string, uploadId: string, videoDBID: string) {
    try {
      const abortCmd = new AbortMultipartUploadCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `originals/${key}`,
        UploadId: uploadId,
      });
      await s3Client.send(abortCmd);

      await DB.delete(videosTable).where(eq(videosTable.id, videoDBID));

      return true;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to abort upload");
    }
  }
}
