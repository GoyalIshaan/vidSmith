import { useNavigate } from "react-router-dom";
import type { Video } from "../types/graphql";

interface YouTubeStyleCardProps {
  video: Video;
}

const YouTubeStyleCard: React.FC<YouTubeStyleCardProps> = ({ video }) => {
  const navigate = useNavigate();

  const CDN_BASE_URL = (
    import.meta as ImportMeta & { env?: Record<string, string> }
  ).env?.VITE_CDN_BASE_URL;

  const thumbnailUrl = `${CDN_BASE_URL}/${video.thumbnailKey}`;

  // Format duration from seconds to MM:SS or HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div
      className="bg-white rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer group"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-video bg-gray-200">
        <img
          src={thumbnailUrl}
          alt={video.videoName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            // Fallback if thumbnail fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.classList.remove("hidden");
              fallback.classList.add("flex");
            }
          }}
        />
        {/* Fallback placeholder if image fails */}
        <div className="absolute inset-0 bg-gray-300 hidden items-center justify-center text-gray-500 text-4xl">
          📹
        </div>
        {/* Duration overlay */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.videoDuration!)}
        </div>
      </div>

      {/* Video info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-black mb-1 line-clamp-2 leading-tight">
          {video.videoName}
        </h3>
        <p className="text-xs text-gray-500">{formatDate(video.createdAt)}</p>
      </div>
    </div>
  );
};

export default YouTubeStyleCard;
