import type { Resolvers } from "./types/graphql";
import type { Video } from "./types/graphql";

export const resolvers: Resolvers = {
  Query: {
    // Get all videos
    videos: async (_parent, _args, ctx) => {
      // ctx is typed as Context, with uploadClient, metadataClient, and pubsub
      return await ctx.metadataClient.getAllVideos();
    },

    // Get a single video
    video: async (_parent, { id }, ctx) => {
      try {
        return await ctx.metadataClient.getVideo(id);
      } catch (err: any) {
        if (err.statusCode === 404) {
          return null;
        }
        // Otherwise, let GraphQL bubble up the error
        throw err;
      }
    },
  },

  Mutation: {
    initiateUpload: async (_parent, { filename }, ctx) => {
      try {
        const { id, uploadInfo } =
          await ctx.uploadClient.initiateUpload(filename);
        return { id, uploadInfo };
      } catch (err: any) {
        // Always throw errors since the return type is non-nullable
        throw err;
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
    filename: (parent) => parent.filename,
    status: (parent) => parent.status,
    manifestUrl: (parent) => parent.manifestUrl ?? null,
    captionsUrl: (parent) => parent.captionsUrl ?? null,
  },

  PresignedUrl: {
    part: (parent) => parent.part,
    url: (parent) => parent.url,
  },

  UploadInfo: {
    uploadId: (parent) => parent.uploadId,
    presignedUrls: (parent) => parent.presignedUrls,
  },

  InitiateUploadResponse: {
    id: (parent) => parent.id,
    uploadInfo: (parent) => parent.uploadInfo,
  },
};
