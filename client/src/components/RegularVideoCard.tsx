import { useNavigate } from "react-router-dom";
import type { Video } from "../types/graphql";

interface RegularVideoCardProps {
  video: Video;
}

const RegularVideoCard: React.FC<RegularVideoCardProps> = ({ video }) => {
  const navigate = useNavigate();

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
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-500">
          {formatDate(video.createdAt)}
        </div>
      </div>
    </div>
  );
};

export default RegularVideoCard;
