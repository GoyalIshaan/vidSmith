import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { useParams, useNavigate } from "react-router-dom";
import type { Video } from "../types/graphql";
import VideoPipeline from "../components/VideoPipeline";
import VideoPlayer from "../components/VideoPlayer";
import VideoInfo from "../components/VideoInfo";
import Banner from "../components/Banner";

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

  const handleRefresh = () => {
    refetch();
  };

  const handleBack = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner />
        <main className="w-full px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-base">
                Loading video details...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner />
        <main className="w-full px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center p-8 bg-white border border-red-200 rounded-lg max-w-md mx-auto">
              <p className="text-red-500 mb-4 font-medium">
                ❌ Error loading video: {error.message}
              </p>
              <button
                onClick={handleRefresh}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner />
        <main className="w-full px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center p-8 bg-white border border-gray-200 rounded-lg max-w-md mx-auto">
              <p className="text-gray-700 mb-4 font-medium">Video not found</p>
              <button
                onClick={handleBack}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200"
              >
                Back to Videos
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <main className="w-full px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-red-500 transition-colors duration-200 text-2xl"
            >
              ←
            </button>
            <h1 className="text-gray-900 text-3xl font-bold">Video Details</h1>
            <button
              onClick={handleRefresh}
              className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-all duration-200 flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Video Info Card */}
          <div className="mb-8">
            <VideoInfo video={video} />
          </div>

          {/* Video Player */}
          {video.status >= 2 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
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

          {/* Pipeline Component */}
          <VideoPipeline status={video.status} videoName={video.videoName} />
        </div>
      </main>
    </div>
  );
};

export default VideoDetails;
