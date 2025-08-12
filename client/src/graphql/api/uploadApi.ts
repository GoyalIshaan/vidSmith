import { apolloClient } from "../client";
import {
  INITIATE_MULTIPART_UPLOAD,
  GENERATE_UPLOAD_PART_URL,
  COMPLETE_MULTIPART_UPLOAD,
  ABORT_MULTIPART_UPLOAD,
} from "../mutations/upload";
import type {
  InitiateUploadResponse,
  CompleteMultipartUploadResponse,
  PartInput,
} from "../../types/graphql";

export interface UploadApiResult<T> {
  data: T | null;
  error: string | null;
}

export interface InitiateUploadParams {
  videoName: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface GeneratePartUrlParams {
  key: string;
  uploadId: string;
  partNumber: number;
}

export interface CompleteUploadParams {
  key: string;
  uploadId: string;
  videoDBID: string;
  parts: PartInput[];
}

export interface AbortUploadParams {
  key: string;
  uploadId: string;
  videoDBID: string;
}

/**
 * Initiate a multipart upload for a video file
 * @param params - Upload initialization parameters
 * @returns Promise with upload initialization data or error
 */
export async function initiateMultipartUpload(
  params: InitiateUploadParams
): Promise<UploadApiResult<InitiateUploadResponse>> {
  try {
    const { data } = await apolloClient.mutate({
      mutation: INITIATE_MULTIPART_UPLOAD,
      variables: params,
    });

    if (!data?.initiateMultipartUpload) {
      return {
        data: null,
        error: "Failed to initiate upload - no response data",
      };
    }

    console.log(`✅ Upload initiated for ${params.videoName}`);
    return {
      data: data.initiateMultipartUpload,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to initiate upload";
    console.error("❌ Error initiating upload:", errorMessage);

    return {
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Generate a presigned URL for uploading a specific part
 * @param params - Part URL generation parameters
 * @returns Promise with presigned URL or error
 */
export async function generateUploadPartUrl(
  params: GeneratePartUrlParams
): Promise<UploadApiResult<string>> {
  try {
    const { data } = await apolloClient.mutate({
      mutation: GENERATE_UPLOAD_PART_URL,
      variables: params,
    });

    if (!data?.generateUploadPartUrl) {
      return {
        data: null,
        error: `Failed to generate URL for part ${params.partNumber}`,
      };
    }

    return {
      data: data.generateUploadPartUrl,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate part URL";
    console.error(
      `❌ Error generating part ${params.partNumber} URL:`,
      errorMessage
    );

    return {
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Complete a multipart upload after all parts are uploaded
 * @param params - Upload completion parameters
 * @returns Promise with completion response or error
 */
export async function completeMultipartUpload(
  params: CompleteUploadParams
): Promise<UploadApiResult<CompleteMultipartUploadResponse>> {
  try {
    const { data } = await apolloClient.mutate({
      mutation: COMPLETE_MULTIPART_UPLOAD,
      variables: params,
    });

    if (!data?.completeMultipartUpload) {
      return {
        data: null,
        error: "Failed to complete upload - no response data",
      };
    }

    console.log(`✅ Upload completed for video ${params.videoDBID}`);
    return {
      data: data.completeMultipartUpload,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to complete upload";
    console.error("❌ Error completing upload:", errorMessage);

    return {
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Abort a multipart upload
 * @param params - Upload abort parameters
 * @returns Promise with success status or error
 */
export async function abortMultipartUpload(
  params: AbortUploadParams
): Promise<UploadApiResult<boolean>> {
  try {
    const { data } = await apolloClient.mutate({
      mutation: ABORT_MULTIPART_UPLOAD,
      variables: params,
    });

    const success = data?.abortMultipartUpload === true;

    if (success) {
      console.log(`🚫 Upload aborted for video ${params.videoDBID}`);
    }

    return {
      data: success,
      error: success ? null : "Failed to abort upload",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to abort upload";
    console.error("❌ Error aborting upload:", errorMessage);

    return {
      data: false,
      error: errorMessage,
    };
  }
}
