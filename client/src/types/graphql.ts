export interface Video {
  id: string;
  videoName: string;
  transcodingFinished: boolean;
  captionsFinished: boolean;
  censorFinished: boolean;
  s3Key?: string;
  bucketName?: string;
  captionsKey?: string;
  manifestKey?: string;
  thumbnailKey?: string;
  videoDuration?: number;
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
