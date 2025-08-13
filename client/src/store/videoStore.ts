import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { fetchAllVideos, clearVideoCache, fetchVideoById } from "../graphql";
import {
  initiateMultipartUpload,
  generateUploadPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from "../graphql/api/uploadApi";

import type { Video, UploadProgress, PartInput } from "../types/graphql";

export interface VideoState {
  // State
  videos: Video[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  cacheExpiry: number; // Cache expiry time in milliseconds (default: 5 minutes)

  // Upload state
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadStatus: string;
  uploadError: string | null;

  // Actions
  fetchVideos: () => Promise<void>;
  refetchVideos: () => Promise<void>;
  fetchLatestVideoById: (id: string) => Promise<Video | null>;
  clearCache: () => void;
  addVideo: (video: Video) => void;
  updateVideo: (video: Partial<Video>) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Upload actions
  uploadVideo: (file: File, videoTitle: string) => Promise<void>;
  abortUpload: () => Promise<void>;
  resetUpload: () => void;
  setUploadProgress: (progress: UploadProgress | null) => void;
  setUploadStatus: (status: string) => void;
  setUploadError: (error: string | null) => void;

  // Selectors/Helpers
  isDataStale: () => boolean;
  getVideoById: (id: string) => Video | undefined;
}

export const useVideoStore = create<VideoState>()(
  devtools(
    (set, get) => {
      // Upload state tracking
      let uploadState: {
        uploadId: string | null;
        videoDBID: string | null;
        key: string | null;
        uploadedParts: PartInput[];
      } = {
        uploadId: null,
        videoDBID: null,
        key: null,
        uploadedParts: [],
      };

      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

      // Helper functions
      const createChunks = (file: File): Blob[] => {
        const chunks: Blob[] = [];
        let start = 0;
        while (start < file.size) {
          const end = Math.min(start + CHUNK_SIZE, file.size);
          chunks.push(file.slice(start, end));
          start = end;
        }
        return chunks;
      };

      const uploadChunk = async (
        presignedUrl: string,
        chunk: Blob
      ): Promise<string> => {
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

        return etag.replace(/"/g, "");
      };

      const resetUploadState = () => {
        uploadState = {
          uploadId: null,
          videoDBID: null,
          key: null,
          uploadedParts: [],
        };
      };

      return {
        // Initial state
        videos: [],
        loading: false,
        error: null,
        lastFetchTime: null,
        cacheExpiry: 2 * 60 * 1000, // 5 minutes in milliseconds

        // Initial upload state
        isUploading: false,
        uploadProgress: null,
        uploadStatus: "",
        uploadError: null,

        // Actions
        fetchVideos: async () => {
          const state = get();

          // Check if we should use cached data
          if (!state.isDataStale() && state.videos.length > 0) {
            console.log("🚀 Using cached video data");
            return;
          }

          console.log("📡 Fetching fresh video data...");
          set({ loading: true, error: null });

          const result = await fetchAllVideos("network-only");

          if (result.data) {
            set({
              videos: result.data,
              loading: false,
              error: null,
              lastFetchTime: Date.now(),
            });

            console.log(`✅ Successfully fetched ${result.data.length} videos`);
          } else {
            set({
              loading: false,
              error: result.error || "Failed to fetch videos",
            });
          }
        },

        refetchVideos: async () => {
          console.log("🔄 Force refetching videos...");
          set({ lastFetchTime: null }); // Clear cache
          await get().fetchVideos();
        },

        fetchLatestVideoById: async (id: string) => {
          const result = await fetchVideoById(id, "network-only");

          if (result.data) {
            const state = get();
            const currentVideo = state.videos.find((v) => v.id === id);

            // Only update if there are actual changes to avoid unnecessary re-renders
            if (currentVideo) {
              const hasChanges =
                currentVideo.transcodingFinished !==
                  result.data.transcodingFinished ||
                currentVideo.captionsFinished !==
                  result.data.captionsFinished ||
                currentVideo.censorFinished !== result.data.censorFinished ||
                currentVideo.s3Key !== result.data.s3Key ||
                currentVideo.captionsKey !== result.data.captionsKey ||
                currentVideo.manifestKey !== result.data.manifestKey ||
                currentVideo.thumbnailKey !== result.data.thumbnailKey ||
                currentVideo.videoDuration !== result.data.videoDuration;

              if (hasChanges) {
                // Only update the specific fields that changed
                set((state) => ({
                  videos: state.videos.map((v) =>
                    v.id === id ? { ...v, ...result.data } : v
                  ),
                }));
                console.log(
                  `✅ Updated video ${id} with new processing status`
                );
              }
            } else {
              // Video not in store, add it
              set((state) => ({
                videos: [result.data as Video, ...state.videos],
              }));
              console.log(`✅ Added video ${id} to store`);
            }

            return result.data;
          } else {
            console.error(`❌ Failed to fetch video ${id}:`, result.error);
            return null;
          }
        },

        clearCache: () => {
          console.log("🗑️ Clearing video cache");
          clearVideoCache(); // Clear Apollo cache
          set({
            videos: [],
            lastFetchTime: null,
            error: null,
          });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        setLoading: (loading: boolean) => {
          set({ loading });
        },

        addVideo: (video: Video) => {
          set((state) => ({ videos: [...state.videos, video] }));
        },

        updateVideo: (video: Partial<Video>) => {
          set((state) => ({
            videos: state.videos.map((v) =>
              v.id === video.id ? { ...v, ...video } : v
            ),
          }));
        },

        // Upload actions
        uploadVideo: async (file: File, videoTitle: string) => {
          try {
            set({
              isUploading: true,
              uploadError: null,
              uploadStatus: "Validating video file...",
              uploadProgress: null,
            });

            // Validate video file
            if (!file.type.startsWith("video/")) {
              throw new Error("Selected file is not a valid video format");
            }
            if (file.size < 1024) {
              throw new Error("Video file is too small or corrupted");
            }

            // Initiate the upload
            set({ uploadStatus: "Preparing video for upload..." });
            const initiateResult = await initiateMultipartUpload({
              videoName: videoTitle.trim(),
              fileName: file.name,
              contentType: file.type,
              size: file.size,
            });

            if (initiateResult.error || !initiateResult.data) {
              throw new Error(
                initiateResult.error || "Failed to initiate upload"
              );
            }

            uploadState.uploadId = initiateResult.data.uploadId;
            uploadState.videoDBID = initiateResult.data.videoDBID;
            uploadState.key = initiateResult.data.key;
            uploadState.uploadedParts = [];

            set({ uploadStatus: "Uploading video..." });

            // Create chunks and upload
            const chunks = createChunks(file);
            const totalParts = chunks.length;

            for (let i = 0; i < chunks.length; i++) {
              const partNumber = i + 1;
              const chunk = chunks[i];

              // Get presigned URL for this part
              const urlResult = await generateUploadPartUrl({
                key: uploadState.key!,
                uploadId: uploadState.uploadId!,
                partNumber,
              });

              if (urlResult.error || !urlResult.data) {
                throw new Error(
                  urlResult.error ||
                    `Failed to generate URL for part ${partNumber}`
                );
              }

              // Upload the chunk
              const etag = await uploadChunk(urlResult.data, chunk);
              uploadState.uploadedParts.push({
                ETag: etag,
                PartNumber: partNumber,
              });

              // Update progress
              set({
                uploadProgress: {
                  uploadedParts: uploadState.uploadedParts.length,
                  totalParts,
                  percentage: Math.round(
                    (uploadState.uploadedParts.length / totalParts) * 100
                  ),
                  currentPart: partNumber,
                },
              });
            }

            // Complete the upload
            const completeResult = await completeMultipartUpload({
              key: uploadState.key!,
              uploadId: uploadState.uploadId!,
              videoDBID: uploadState.videoDBID!,
              parts: uploadState.uploadedParts,
            });

            if (completeResult.error || !completeResult.data) {
              throw new Error(
                completeResult.error || "Failed to complete upload"
              );
            }

            set({
              uploadStatus: `Upload completed! Video: ${videoTitle}`,
              uploadProgress: {
                uploadedParts: totalParts,
                totalParts,
                percentage: 100,
                currentPart: totalParts,
              },
            });

            // Add the completed video to the store
            const newVideo: Video = completeResult.data.video;

            // Add to videos list and invalidate cache to refetch
            set((state) => ({
              videos: [newVideo, ...state.videos],
              lastFetchTime: null, // Force refresh on next fetch
            }));

            console.log(`✅ Video uploaded and added to store: ${videoTitle}`);

            // Reset upload state for next upload
            resetUploadState();
          } catch (err) {
            console.error("Upload error:", err);
            const errorMessage =
              err instanceof Error ? err.message : "Upload failed";
            set({
              uploadError: errorMessage,
              uploadStatus: "",
            });

            // Try to abort the upload if it was initiated
            if (
              uploadState.uploadId &&
              uploadState.videoDBID &&
              uploadState.key
            ) {
              try {
                await abortMultipartUpload({
                  key: uploadState.key,
                  uploadId: uploadState.uploadId,
                  videoDBID: uploadState.videoDBID,
                });
              } catch (abortError) {
                console.error("Failed to abort upload:", abortError);
              }
            }
            resetUploadState();
          } finally {
            set({ isUploading: false });
          }
        },

        abortUpload: async () => {
          try {
            if (
              uploadState.uploadId &&
              uploadState.videoDBID &&
              uploadState.key
            ) {
              await abortMultipartUpload({
                key: uploadState.key,
                uploadId: uploadState.uploadId,
                videoDBID: uploadState.videoDBID,
              });
            }
            resetUploadState();
            set({
              uploadStatus: "Upload aborted",
              uploadProgress: null,
              isUploading: false,
              uploadError: null,
            });
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : "Failed to abort upload";
            set({ uploadError: errorMessage });
          }
        },

        resetUpload: () => {
          resetUploadState();
          set({
            isUploading: false,
            uploadProgress: null,
            uploadStatus: "",
            uploadError: null,
          });
        },

        setUploadProgress: (progress: UploadProgress | null) => {
          set({ uploadProgress: progress });
        },

        setUploadStatus: (status: string) => {
          set({ uploadStatus: status });
        },

        setUploadError: (error: string | null) => {
          set({ uploadError: error });
        },

        // Selectors/Helpers
        isDataStale: () => {
          const state = get();
          if (!state.lastFetchTime) return true;

          const now = Date.now();
          return now - state.lastFetchTime > state.cacheExpiry;
        },

        getVideoById: (id: string) => {
          const state = get();
          return state.videos.find((video) => video.id === id);
        },
      };
    },
    {
      name: "video-store", // Name for devtools
    }
  )
);

// Export individual actions for convenience
export const {
  fetchVideos,
  refetchVideos,
  fetchLatestVideoById,
  clearCache,
  setError,
  setLoading,
  isDataStale,
  getVideoById,
  addVideo,
  uploadVideo,
  abortUpload,
  resetUpload,
  setUploadProgress,
  setUploadStatus,
  setUploadError,
} = useVideoStore.getState();
