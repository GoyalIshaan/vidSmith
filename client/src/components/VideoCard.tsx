import type { Video } from "../types/graphql";
import YouTubeStyleCard from "./YouTubeStyleCard";
import RegularVideoCard from "./RegularVideoCard";

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  // Check if video has thumbnail and duration for YouTube-style display
  const hasYouTubeStyleData =
    video.videoDuration &&
    video.videoDuration > 0 &&
    video.thumbnailKey &&
    video.thumbnailKey.trim() !== "";

  if (hasYouTubeStyleData) {
    return <YouTubeStyleCard video={video} />;
  }

  return <RegularVideoCard video={video} />;
};

export default VideoCard;
