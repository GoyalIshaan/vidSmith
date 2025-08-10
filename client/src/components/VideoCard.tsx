import { useNavigate } from "react-router-dom";
import type { Video } from "../types/graphql";

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status: number) => {
    const baseClasses =
      "px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1";
    if (status === 6) {
      return `${baseClasses} bg-green-500`; // Everything done
    } else if (status === 5) {
      return `${baseClasses} bg-purple-500`; // Captioning + Censoring done
    } else if (status === 4) {
      return `${baseClasses} bg-amber-500`; // Transcoding + Censoring (captioning failed/skipped)
    } else if (status === 3) {
      return `${baseClasses} bg-blue-500`; // Transcoding + Captioning done
    } else if (status === 2) {
      return `${baseClasses} bg-yellow-500`; // Captioning done
    } else if (status === 1) {
      return `${baseClasses} bg-orange-500`; // Transcoding done
    } else if (status === 0) {
      return `${baseClasses} bg-gray-500`; // Just uploaded
    } else {
      return `${baseClasses} bg-red-500`; // Error or unknown status
    }
  };

  const getStatusIcon = (status: number) => {
    if (status === 6) {
      return "✅"; // Everything done
    } else if (status === 5) {
      return "🔍"; // Captioning + Censoring done
    } else if (status === 4) {
      return "🔨"; // Transcoding + Censoring (captioning failed/skipped)
    } else if (status === 3) {
      return "📝"; // Transcoding + Captioning done
    } else if (status === 2) {
      return "📝"; // Captioning done
    } else if (status === 1) {
      return "🔄"; // Transcoding done
    } else if (status === 0) {
      return "⏳"; // Just uploaded
    } else {
      return "❌"; // Error or unknown status
    }
  };

  const getStatusText = (status: number) => {
    if (status === 6) {
      return "READY";
    } else if (status === 5) {
      return "PROCESSING FINAL";
    } else if (status === 4) {
      return "PARTIAL PROCESSING";
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-lg relative overflow-hidden cursor-pointer"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>

      <div className="mb-3">
        <div className="text-sm font-medium text-black mb-2 line-clamp-2">
          {video.videoName}
        </div>
        <div className={getStatusBadgeClass(video.status)}>
          {getStatusIcon(video.status)} {getStatusText(video.status)}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-500">
          {formatDate(video.createdAt)}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
