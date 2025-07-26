import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import type { Video } from "../types/graphql";

const GET_VIDEOS = gql`
  query GetVideos {
    videos {
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

const VideoList: React.FC = () => {
  const navigate = useNavigate();
  const { loading, error, data, refetch } = useQuery(GET_VIDEOS);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    console.log("VideoList - GraphQL Response:", { loading, error, data });
    if (data?.videos) {
      console.log("Setting videos:", data.videos);
      setVideos(data.videos);
    } else if (data) {
      console.log("Data exists but no videos property:", data);
    }
  }, [data, loading, error]);

  const getStatusBadgeClass = (status: number) => {
    const baseClasses =
      "px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1";
    if (status >= 6) {
      return `${baseClasses} bg-green-500`;
    } else if (status >= 3) {
      return `${baseClasses} bg-blue-500`;
    } else if (status >= 1) {
      return `${baseClasses} bg-yellow-500`;
    } else if (status === 0) {
      return `${baseClasses} bg-orange-500`;
    } else {
      return `${baseClasses} bg-red-500`;
    }
  };

  const getStatusIcon = (status: number) => {
    if (status >= 6) {
      return "✅";
    } else if (status >= 3) {
      return "🔍"; // Censoring
    } else if (status >= 1) {
      return "📝"; // Captioning
    } else if (status === 0) {
      return "🔄"; // Transcoding
    } else {
      return "❌";
    }
  };

  const getStatusText = (status: number) => {
    if (status >= 6) {
      return "READY";
    } else if (status >= 3) {
      return "CENSORING";
    } else if (status >= 1) {
      return "CAPTIONING";
    } else if (status === 0) {
      return "TRANSCODING";
    } else {
      return "ERROR";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    console.log("VideoList - Still loading...");
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-white border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black text-lg">Loading videos...</p>
          <p className="text-gray-500 text-sm mt-2">
            Debug: Loading={loading ? "true" : "false"}, Data=
            {data ? "exists" : "null"}, Error={error ? "exists" : "none"}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center p-8 bg-white border border-red-500 rounded-lg">
          <p className="text-red-500 mb-4 font-medium">
            ❌ Error loading videos: {error.message}
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

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-black">
        <h2 className="text-black text-3xl font-semibold">Uploaded Videos</h2>
        <button
          onClick={handleRefresh}
          className="bg-red-500 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-black">
          <div className="text-6xl mb-4 opacity-50">📹</div>
          <h3 className="text-black text-xl font-semibold mb-2">
            No videos uploaded yet
          </h3>
          <p className="text-black">Upload your first video to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white border border-black rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden cursor-pointer"
              onClick={() => navigate(`/video/${video.id}`)}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>

              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="text-lg font-semibold text-black flex-1 break-words">
                  {video.videoName}
                </div>
                <div className={getStatusBadgeClass(video.status)}>
                  {getStatusIcon(video.status)} {getStatusText(video.status)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-black">Uploaded:</span>
                  <span className="text-black text-right">
                    {formatDate(video.createdAt)}
                  </span>
                </div>

                <div className="text-center mt-4">
                  <span className="text-gray-600 text-sm">
                    Click to view details →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoList;
