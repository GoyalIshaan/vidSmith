import React from "react";
import type { Video } from "../types/graphql";

interface VideoInfoProps {
  video: Video;
}

const VideoInfo: React.FC<VideoInfoProps> = ({ video }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const duration = formatDuration(video.videoDuration);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{video.videoName}</h2>
          <p className="text-xs text-gray-500 font-mono">ID: {video.id}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Uploaded: {formatDate(video.createdAt)}</span>
          {duration && (
            <>
              <span>•</span>
              <span>Duration: {duration}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoInfo;
