export interface Video {
  id: string;
  videoName: string;
  status: number;
  s3Key?: string;
  bucketName?: string;
  captionsKey?: string;
  createdAt: string;
}

export type VideoStatus = "UPLOADING" | "TRANSCODING" | "READY" | "ERROR";

export interface PartInput {
  ETag: string;
  PartNumber: number;
}

export interface InitiateUploadResponse {
  uploadId: string;
  videoDBID: string;
  key: string;
}

export interface CompleteMultipartUploadResponse {
  videoDBID: string;
  bucketName: string;
  status: VideoStatus;
}

export interface UploadProgress {
  uploadedParts: number;
  totalParts: number;
  percentage: number;
  currentPart?: number;
}
