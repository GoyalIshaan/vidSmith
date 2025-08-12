import { gql } from "@apollo/client";
import { VIDEO_FIELDS } from "../queries/video";

// Subscription for video processing updates
export const VIDEO_PROCESSED_SUBSCRIPTION = gql`
  ${VIDEO_FIELDS}
  subscription VideoProcessed($id: ID!) {
    videoProcessed(id: $id) {
      ...VideoFields
    }
  }
`;
