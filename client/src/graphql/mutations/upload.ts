import { gql } from "@apollo/client";

// Mutation to initiate multipart upload
export const INITIATE_MULTIPART_UPLOAD = gql`
  mutation InitiateMultipartUpload(
    $videoName: String!
    $fileName: String!
    $contentType: String!
    $size: Int!
  ) {
    initiateMultipartUpload(
      videoName: $videoName
      fileName: $fileName
      contentType: $contentType
      size: $size
    ) {
      uploadId
      videoDBID
      key
    }
  }
`;

// Mutation to generate upload part URL
export const GENERATE_UPLOAD_PART_URL = gql`
  mutation GenerateUploadPartUrl(
    $key: String!
    $uploadId: String!
    $partNumber: Int!
  ) {
    generateUploadPartUrl(
      key: $key
      uploadId: $uploadId
      partNumber: $partNumber
    )
  }
`;

// Mutation to complete multipart upload
export const COMPLETE_MULTIPART_UPLOAD = gql`
  mutation CompleteMultipartUpload(
    $key: String!
    $uploadId: String!
    $videoDBID: String!
    $parts: [PartInput!]!
  ) {
    completeMultipartUpload(
      key: $key
      uploadId: $uploadId
      videoDBID: $videoDBID
      parts: $parts
    ) {
      video {
        id
        videoName
        transcodingFinished
        captionsFinished
        censorFinished
        s3Key
        bucketName
        captionsKey
        manifestKey
        thumbnailKey
        videoDuration
        createdAt
      }
    }
  }
`;

// Mutation to abort multipart upload
export const ABORT_MULTIPART_UPLOAD = gql`
  mutation AbortMultipartUpload(
    $key: String!
    $uploadId: String!
    $videoDBID: String!
  ) {
    abortMultipartUpload(key: $key, uploadId: $uploadId, videoDBID: $videoDBID)
  }
`;
