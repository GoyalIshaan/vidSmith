import { client } from "./apollo";
import { gql } from "@apollo/client";
import type {
  InitiateUploadResponse,
  CompleteMultipartUploadResponse,
  PartInput,
  UploadProgress,
} from "../types/graphql";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

// GraphQL mutations
const INITIATE_UPLOAD = gql`
  mutation InitiateMultipartUpload(
    $videoName: String!
    $fileName: String!
    $contentType: String!
    $size: Int!
  ) {
    initiateMultipartUpload(
      videoName: $videoName
      fileName: $fileName
      contentType: $contentType
      size: $size
    ) {
      uploadId
      videoDBID
      key
    }
  }
`;

const GENERATE_PART_URL = gql`
  mutation GenerateUploadPartUrl(
    $key: String!
    $uploadId: String!
    $partNumber: Int!
  ) {
    generateUploadPartUrl(
      key: $key
      uploadId: $uploadId
      partNumber: $partNumber
    )
  }
`;

const COMPLETE_UPLOAD = gql`
  mutation CompleteMultipartUpload(
    $key: String!
    $uploadId: String!
    $videoDBID: String!
    $parts: [PartInput!]!
  ) {
    completeMultipartUpload(
      key: $key
      uploadId: $uploadId
      videoDBID: $videoDBID
      parts: $parts
    ) {
      videoDBID
      bucketName
      status
    }
  }
`;

const ABORT_UPLOAD = gql`
  mutation AbortMultipartUpload(
    $key: String!
    $uploadId: String!
    $videoDBID: String!
  ) {
    abortMultipartUpload(key: $key, uploadId: $uploadId, videoDBID: $videoDBID)
  }
`;

export class UploadService {
  private uploadId: string | null = null;
  private videoDBID: string | null = null;
  private key: string | null = null;
  private uploadedParts: PartInput[] = [];
  private totalParts: number = 0;

  async initiateUpload(
    file: File,
    customVideoName?: string
  ): Promise<InitiateUploadResponse> {
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    this.totalParts = totalParts;

    const response = await client.mutate({
      mutation: INITIATE_UPLOAD,
      variables: {
        videoName: customVideoName || file.name.split(".")[0], // Use custom name or file name without extension
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      },
    });

    const result = response.data.initiateMultipartUpload;
    this.uploadId = result.uploadId;
    this.videoDBID = result.videoDBID;
    this.key = result.key;

    return result;
  }

  async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CompleteMultipartUploadResponse> {
    if (!this.uploadId || !this.videoDBID || !this.key) {
      throw new Error("Upload not initiated. Call initiateUpload first.");
    }

    const chunks = this.createChunks(file);
    this.uploadedParts = [];

    for (let i = 0; i < chunks.length; i++) {
      const partNumber = i + 1;
      const chunk = chunks[i];

      // Get presigned URL for this part
      const urlResponse = await client.mutate({
        mutation: GENERATE_PART_URL,
        variables: {
          key: this.key,
          uploadId: this.uploadId,
          partNumber,
        },
      });

      const presignedUrl = urlResponse.data.generateUploadPartUrl;

      // Upload the chunk
      const etag = await this.uploadChunk(presignedUrl, chunk);

      this.uploadedParts.push({
        ETag: etag,
        PartNumber: partNumber,
      });

      // Update progress
      if (onProgress) {
        onProgress({
          uploadedParts: this.uploadedParts.length,
          totalParts: this.totalParts,
          percentage: Math.round(
            (this.uploadedParts.length / this.totalParts) * 100
          ),
          currentPart: partNumber,
        });
      }
    }

    // Complete the upload
    const completeResponse = await client.mutate({
      mutation: COMPLETE_UPLOAD,
      variables: {
        key: this.key,
        uploadId: this.uploadId,
        videoDBID: this.videoDBID,
        parts: this.uploadedParts,
      },
    });

    return completeResponse.data.completeMultipartUpload;
  }

  async abortUpload(): Promise<boolean> {
    if (!this.uploadId || !this.videoDBID || !this.key) {
      throw new Error("No active upload to abort.");
    }

    const response = await client.mutate({
      mutation: ABORT_UPLOAD,
      variables: {
        key: this.key,
        uploadId: this.uploadId,
        videoDBID: this.videoDBID,
      },
    });

    // Reset state
    this.uploadId = null;
    this.videoDBID = null;
    this.key = null;
    this.uploadedParts = [];
    this.totalParts = 0;

    return response.data.abortMultipartUpload;
  }

  private createChunks(file: File): Blob[] {
    const chunks: Blob[] = [];
    let start = 0;

    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      chunks.push(file.slice(start, end));
      start = end;
    }

    return chunks;
  }

  private async uploadChunk(
    presignedUrl: string,
    chunk: Blob
  ): Promise<string> {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: chunk,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload chunk: ${response.statusText}`);
    }

    const etag = response.headers.get("ETag");
    if (!etag) {
      throw new Error("No ETag received from S3");
    }

    // Remove quotes from ETag
    return etag.replace(/"/g, "");
  }

  reset(): void {
    this.uploadId = null;
    this.videoDBID = null;
    this.key = null;
    this.uploadedParts = [];
    this.totalParts = 0;
  }
}
