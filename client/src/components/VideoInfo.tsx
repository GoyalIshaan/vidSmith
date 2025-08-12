import React from "react";
import type { Video } from "../types/graphql";
import { getVideoStatusLarge } from "../lib/videoStatus";

interface VideoInfoProps {
  video: Video;
}

const VideoInfo: React.FC<VideoInfoProps> = ({ video }) => {
  const videoStatus = getVideoStatusLarge(video);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8">
      {/* Header with title and status */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-gray-900 text-2xl font-bold mb-2">
            {video.videoName}
          </h2>
          <p className="text-gray-600">Video ID: {video.id}</p>
        </div>
        <div className={videoStatus.badgeClass}>
          {videoStatus.icon} {videoStatus.text}
        </div>
      </div>

      {/* Video metadata grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Uploaded:</span>
            <span className="text-gray-700">{formatDate(video.createdAt)}</span>
          </div>

          {video.bucketName && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Bucket:</span>
              <span className="text-gray-700">{video.bucketName}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {video.s3Key && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">S3 Key:</span>
              <span className="text-gray-700 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-1 rounded break-all max-w-xs">
                {video.s3Key}
              </span>
            </div>
          )}

          {video.captionsKey && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Captions:</span>
              <span className="text-gray-700 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-1 rounded break-all max-w-xs">
                {video.captionsKey}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoInfo;
