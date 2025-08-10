import React from "react";
import type { Video } from "../types/graphql";

interface VideoInfoProps {
  video: Video;
}

const VideoInfo: React.FC<VideoInfoProps> = ({ video }) => {
  const getStatusText = (status: number) => {
    if (status === 6) {
      return "READY";
    } else if (status === 5) {
      return "PROCESSING FINAL";
    } else if (status === 3) {
      return "CENSORING";
    } else if (status === 2) {
      return "CAPTIONING DONE";
    } else if (status === 1) {
      return "TRANSCODING DONE";
    } else if (status === 0) {
      return "UPLOADED";
    } else {
      return "ERROR";
    }
  };

  const getStatusBadgeClass = (status: number) => {
    const baseClasses =
      "px-4 py-2 rounded-full text-sm font-semibold text-white flex items-center gap-2";
    if (status === 6) {
      return `${baseClasses} bg-green-500`; // Everything done
    } else if (status === 5) {
      return `${baseClasses} bg-purple-500`; // Captioning + Censoring done
    } else if (status === 3) {
      return `${baseClasses} bg-blue-500`; // Transcoding + Captioning done
    } else if (status === 2) {
      return `${baseClasses} bg-yellow-500`; // Captioning done
    } else if (status === 1) {
      return `${baseClasses} bg-orange-500`; // Transcoding done
    } else if (status === 0) {
      return `${baseClasses} bg-gray-500`; // Just uploaded
    } else {
      return `${baseClasses} bg-red-500`; // Error
    }
  };

  const getStatusIcon = (status: number) => {
    if (status === 6) {
      return "✅"; // Everything done
    } else if (status === 5) {
      return "🔍"; // Captioning + Censoring done
    } else if (status === 3) {
      return "📝"; // Transcoding + Captioning done
    } else if (status === 2) {
      return "📝"; // Captioning done
    } else if (status === 1) {
      return "🔄"; // Transcoding done
    } else if (status === 0) {
      return "⏳"; // Just uploaded
    } else {
      return "❌"; // Error
    }
  };

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
        <div className={getStatusBadgeClass(video.status)}>
          {getStatusIcon(video.status)} {getStatusText(video.status)}
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
