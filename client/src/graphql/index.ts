// GraphQL Client
export { apolloClient as default, apolloClient } from "./client";

// Video API Functions
export {
  fetchAllVideos,
  fetchVideoById,
  refetchAllVideos,
  clearVideoCache,
  isVideoCached,
  type VideoApiResult,
} from "./api/videoApi";

// Upload API Functions
export {
  initiateMultipartUpload,
  generateUploadPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  type UploadApiResult,
  type InitiateUploadParams,
  type GeneratePartUrlParams,
  type CompleteUploadParams,
  type AbortUploadParams,
} from "./api/uploadApi";

// Query and Mutation exports (for advanced usage)
export { GET_VIDEOS, GET_VIDEO, VIDEO_FIELDS } from "./queries/video";
export {
  INITIATE_MULTIPART_UPLOAD,
  GENERATE_UPLOAD_PART_URL,
  COMPLETE_MULTIPART_UPLOAD,
  ABORT_MULTIPART_UPLOAD,
} from "./mutations/upload";
export { VIDEO_PROCESSED_SUBSCRIPTION } from "./subscriptions/video";
