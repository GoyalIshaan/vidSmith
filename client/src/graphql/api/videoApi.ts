import { apolloClient } from "../client";
import { GET_VIDEOS, GET_VIDEO } from "../queries/video";
import type { Video } from "../../types/graphql";
import type { FetchPolicy } from "@apollo/client";

export interface VideoApiResult<T> {
  data: T | null;
  error: string | null;
  loading?: boolean;
}

/**
 * Fetch all videos from the server
 * @param fetchPolicy - Apollo fetch policy (optional)
 * @returns Promise with videos data or error
 */
export async function fetchAllVideos(
  fetchPolicy: FetchPolicy = "network-only"
): Promise<VideoApiResult<Video[]>> {
  try {
    const { data } = await apolloClient.query({
      query: GET_VIDEOS,
      fetchPolicy,
      errorPolicy: "all",
    });

    return {
      data: data.videos || [],
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch videos";
    console.error("❌ Error fetching videos:", errorMessage);

    return {
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Fetch a single video by ID
 * @param id - Video ID
 * @param fetchPolicy - Apollo fetch policy (optional)
 * @returns Promise with video data or error
 */
export async function fetchVideoById(
  id: string,
  fetchPolicy: FetchPolicy = "cache-first"
): Promise<VideoApiResult<Video>> {
  try {
    const { data } = await apolloClient.query({
      query: GET_VIDEO,
      variables: { id },
      fetchPolicy,
      errorPolicy: "all",
    });

    if (!data.video) {
      return {
        data: null,
        error: `Video with ID "${id}" not found`,
      };
    }

    return {
      data: data.video,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch video";
    console.error(`❌ Error fetching video ${id}:`, errorMessage);

    return {
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Refresh the Apollo cache for videos
 * This forces a fresh fetch from the server
 */
export async function refetchAllVideos(): Promise<VideoApiResult<Video[]>> {
  try {
    await apolloClient.refetchQueries({
      include: [GET_VIDEOS],
    });

    // Get the fresh data from cache after refetch
    const { data } = await apolloClient.query({
      query: GET_VIDEOS,
      fetchPolicy: "cache-only",
    });
    const videos = data.videos || [];

    return {
      data: videos,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to refetch videos";
    console.error("❌ Error refetching videos:", errorMessage);

    return {
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Clear video cache in Apollo
 * This removes all cached video data
 */
export function clearVideoCache(): void {
  try {
    apolloClient.cache.evict({ fieldName: "videos" });
    apolloClient.cache.evict({ fieldName: "video" });
    apolloClient.cache.gc();
    console.log("🗑️ Video cache cleared");
  } catch (error) {
    console.error("❌ Error clearing video cache:", error);
  }
}

/**
 * Check if video data exists in cache
 * @param id - Optional video ID to check specific video
 * @returns boolean indicating cache status
 */
export function isVideoCached(id?: string): boolean {
  try {
    if (id) {
      const cached = apolloClient.cache.readQuery({
        query: GET_VIDEO,
        variables: { id },
      });
      return !!(cached as { video?: Video })?.video;
    } else {
      const cached = apolloClient.cache.readQuery({
        query: GET_VIDEOS,
      });
      return !!(cached as { videos?: Video[] })?.videos;
    }
  } catch {
    return false;
  }
}
