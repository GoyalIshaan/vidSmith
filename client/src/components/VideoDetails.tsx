import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { useParams, useNavigate } from "react-router-dom";
import type { Video } from "../types/graphql";
import VideoPipeline from "./VideoPipeline";
import VideoPlayer from "./VideoPlayer";

const GET_VIDEO = gql`
  query GetVideo($id: ID!) {
    video(id: $id) {
      id
      videoName
      status
      s3Key
      bucketName
      captionsKey
      createdAt
    }
  }
`;

const VideoDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading, error, data, refetch } = useQuery(GET_VIDEO, {
    variables: { id },
    pollInterval: 3000, // Poll every 3 seconds for status updates
    skip: !id,
  });
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (data?.video) {
      setVideo(data.video);
    }
  }, [data]);

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

  const handleRefresh = () => {
    refetch();
  };

  const handleBack = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-white border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black text-lg">Loading video details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center p-8 bg-white border border-red-500 rounded-lg">
          <p className="text-red-500 mb-4 font-medium">
            ❌ Error loading video: {error.message}
          </p>
          <button
            onClick={handleRefresh}
            className="bg-red-500 hover:bg-black text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center p-8 bg-white border border-black rounded-lg">
          <p className="text-black mb-4 font-medium">Video not found</p>
          <button
            onClick={handleBack}
            className="bg-red-500 hover:bg-black text-white px-5 py-2 rounded-lg font-semibold transition-all duration-300"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="text-black hover:text-red-500 transition-colors duration-300 text-2xl"
        >
          ←
        </button>
        <h1 className="text-black text-3xl font-bold">Video Details</h1>
        <button
          onClick={handleRefresh}
          className="ml-auto bg-red-500 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Video Info Card */}
      <div className="bg-white border border-black rounded-xl p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-black text-2xl font-bold mb-2">
              {video.videoName}
            </h2>
            <p className="text-gray-600">Video ID: {video.id}</p>
          </div>
          <div className={getStatusBadgeClass(video.status)}>
            {getStatusIcon(video.status)} {getStatusText(video.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-semibold text-black">Uploaded:</span>
              <span className="text-black">{formatDate(video.createdAt)}</span>
            </div>

            {video.bucketName && (
              <div className="flex justify-between">
                <span className="font-semibold text-black">Bucket:</span>
                <span className="text-black">{video.bucketName}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {video.s3Key && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black">S3 Key:</span>
                <span className="text-black font-mono text-xs bg-gray-100 border border-black px-2 py-1 rounded break-all max-w-xs">
                  {video.s3Key}
                </span>
              </div>
            )}

            {video.captionsKey && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-black">Captions:</span>
                <span className="text-black font-mono text-xs bg-gray-100 border border-black px-2 py-1 rounded break-all max-w-xs">
                  {video.captionsKey}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Video Player */}
        {video.status >= 2 && (
          <div className="mt-6 pt-6 border-t border-black">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-2">
                Video Player
              </h3>
              <p className="text-sm text-gray-600">
                {video.status >= 6
                  ? "Adaptive bitrate streaming with automatic quality selection"
                  : "Video available for playback (processing may still be ongoing)"}
              </p>
            </div>
            <VideoPlayer
              videoId={video.id}
              className="w-full"
              onReady={() => {
                // Video player ready
              }}
              debug={false}
            />
          </div>
        )}
      </div>

      {/* Pipeline Component */}
      <VideoPipeline status={video.status} videoName={video.videoName} />
    </div>
  );
};

export default VideoDetails;
