import { gql } from "@apollo/client";

// Fragment for common video fields
export const VIDEO_FIELDS = gql`
  fragment VideoFields on Video {
    id
    videoName
    transcodingFinished
    captionsFinished
    censorFinished
    captionsKey
    manifestKey
    thumbnailKey
    videoDuration
    createdAt
  }
`;

// Query to get all videos
export const GET_VIDEOS = gql`
  ${VIDEO_FIELDS}
  query GetVideos {
    videos {
      ...VideoFields
    }
  }
`;

// Query to get a single video by ID
export const GET_VIDEO = gql`
  ${VIDEO_FIELDS}
  query GetVideo($id: ID!) {
    video(id: $id) {
      ...VideoFields
    }
  }
`;
