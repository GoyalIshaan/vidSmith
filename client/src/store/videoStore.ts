import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { fetchAllVideos, clearVideoCache, fetchVideoById } from "../graphql";
import { UploadService } from "../lib/uploadService";
import type { Video, UploadProgress } from "../types/graphql";

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
      // Create a single upload service instance
      const uploadService = new UploadService();

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

            // Initiate the upload
            set({ uploadStatus: "Preparing video for upload..." });
            await uploadService.initiateUpload(file, videoTitle.trim());

            set({ uploadStatus: "Uploading video..." });

            // Upload the file with progress tracking
            const result = await uploadService.uploadFile(file, (progress) => {
              set({ uploadProgress: progress });
            });

            set({
              uploadStatus: `Upload completed! Video: ${videoTitle}`,
              uploadProgress: {
                uploadedParts: 1,
                totalParts: 1,
                percentage: 100,
              },
            });

            // Add the completed video to the store
            // Use the video object returned from the backend
            const newVideo: Video = result.video;

            // Add to videos list and invalidate cache to refetch
            set((state) => ({
              videos: [newVideo, ...state.videos],
              lastFetchTime: null, // Force refresh on next fetch
            }));

            console.log(`✅ Video uploaded and added to store: ${videoTitle}`);

            // Reset upload service for next upload
            uploadService.reset();
          } catch (err) {
            console.error("Upload error:", err);
            const errorMessage =
              err instanceof Error ? err.message : "Upload failed";
            set({
              uploadError: errorMessage,
              uploadStatus: "",
            });

            // Try to abort the upload if it was initiated
            try {
              await uploadService.abortUpload();
            } catch (abortError) {
              console.error("Failed to abort upload:", abortError);
            }
          } finally {
            set({ isUploading: false });
          }
        },

        abortUpload: async () => {
          try {
            await uploadService.abortUpload();
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
          uploadService.reset();
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
