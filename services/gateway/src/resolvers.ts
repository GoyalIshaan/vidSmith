import type { Resolvers } from "./types/graphql";
import type { Video } from "./types/graphql";
import { DB } from "./db/dbSetup";
import { videosTable } from "./db/schema";
import { eq } from "drizzle-orm";

export const resolvers: Resolvers = {
  Query: {
    // Get all videos
    videos: async (_parent, _args, ctx) => {
      try {
        const videos = await ctx.metadataClient.getAllVideos();
        return videos.map((video) => ({
          id: video.id,
          videoName: video.videoName, // Map videoName to filename
          status: video.status,
          s3Key: video.s3Key,
          bucketName: video.bucketName,
          captionsKey: video.captionsKey,
          createdAt: video.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error("Error fetching videos:", error);
        throw new Error("Failed to fetch videos");
      }
    },

    // Get a single video
    video: async (_parent, { id }, ctx) => {
      try {
        const video = await ctx.metadataClient.getVideo(id);

        if (!video) {
          return null;
        }

        return {
          id: video.id,
          videoName: video.videoName, // Map videoName to filename
          status: video.status,
          s3Key: video.s3Key,
          bucketName: video.bucketName,
          captionsKey: video.captionsKey,
          createdAt: video.createdAt.toISOString(),
        };
      } catch (error) {
        console.error("Error fetching video:", error);
        throw new Error("Failed to fetch video");
      }
    },
  },

  Mutation: {
    initiateMultipartUpload: async (
      _parent,
      { videoName, fileName, contentType, size },
      ctx
    ) => {
      try {
        const result = await ctx.uploadClient.initiateMultipartUpload(
          videoName,
          fileName,
          contentType,
          size
        );
        return result;
      } catch (error) {
        console.error("Error initiating upload:", error);
        throw new Error("Failed to initiate upload");
      }
    },

    generateUploadPartUrl: async (
      _parent,
      { key, uploadId, partNumber },
      ctx
    ) => {
      try {
        const presignedUrl = await ctx.uploadClient.generateUploadPartUrl(
          key,
          uploadId,
          partNumber
        );
        return presignedUrl;
      } catch (error) {
        console.error("Error generating upload URL:", error);
        throw new Error("Failed to generate upload URL");
      }
    },

    completeMultipartUpload: async (
      _parent,
      { key, uploadId, videoDBID, parts },
      ctx
    ) => {
      try {
        const result = await ctx.uploadClient.completeMultipartUpload(
          key,
          uploadId,
          videoDBID,
          parts
        );
        return {
          ...result,
          status: result.status,
        };
      } catch (error) {
        console.error("Error completing upload:", error);
        throw new Error("Failed to complete upload");
      }
    },

    abortMultipartUpload: async (
      _parent,
      { key, uploadId, videoDBID },
      ctx
    ) => {
      try {
        const result = await ctx.uploadClient.abortMultipartUpload(
          key,
          uploadId,
          videoDBID
        );
        return result;
      } catch (error) {
        console.error("Error aborting upload:", error);
        throw new Error("Failed to abort upload");
      }
    },
  },

  Subscription: {
    videoProcessed: {
      subscribe: async (_parent, { id }, ctx) => {
        return ctx.pubsub.subscribe(`video-processed-${id}`);
      },
      resolve: (payload: Video) => {
        return payload;
      },
    },
  },

  Video: {
    id: (parent) => parent.id,
    videoName: (parent) => parent.videoName,
    status: (parent) => parent.status,
    s3Key: (parent) => parent.s3Key,
    bucketName: (parent) => parent.bucketName,
    captionsKey: (parent) => parent.captionsKey,
    createdAt: (parent) => parent.createdAt,
  },

  PresignedUrl: {
    part: (parent) => parent.part,
    url: (parent) => parent.url,
  },

  UploadInfo: {
    uploadId: (parent) => parent.uploadId,
    presignedUrls: (parent) => parent.presignedUrls,
  },

  CompleteMultipartUploadResponse: {
    videoDBID: (parent) => parent.videoDBID,
    bucketName: (parent) => parent.bucketName,
    status: (parent) => parent.status,
  },

  InitiateUploadResponse: {
    uploadId: (parent) => parent.uploadId,
    videoDBID: (parent) => parent.videoDBID,
    key: (parent) => parent.key,
  },
};
