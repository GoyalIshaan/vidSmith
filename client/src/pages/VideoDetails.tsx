import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import VideoPipeline from "../components/VideoPipeline";
import VideoInfo from "../components/VideoInfo";
import Banner from "../components/Banner";
import YouTubeVideoPlayer from "../components/YouTubeVideoPlayer";
import { usePageTitle } from "../hooks/usePageTitle";
import { useVideoStore } from "../store/videoStore";

const VideoDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use Zustand store with specific selectors to minimize re-renders
  const { fetchLatestVideoById } = useVideoStore();

  // Get video from store with a selector to avoid unnecessary re-renders
  const video = useVideoStore((state) =>
    id ? state.videos.find((v) => v.id === id) : null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if video processing is complete
  const isProcessingComplete =
    video &&
    video.transcodingFinished &&
    video.captionsFinished &&
    video.censorFinished;

  // Set dynamic page title based on video name
  usePageTitle(video ? video.videoName : "Video Details");

  // Single effect to handle video loading and polling
  useEffect(() => {
    if (!id) return;

    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Initial load
    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      try {
        const latestVideo = await fetchLatestVideoById(id);
        if (!latestVideo) {
          setError("Video not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    loadVideo();

    // Only set up polling if processing is not complete
    if (!isProcessingComplete) {
      // Set up polling that checks the current video state each time
      pollIntervalRef.current = setInterval(async () => {
        const currentVideo = useVideoStore
          .getState()
          .videos.find((v) => v.id === id);
        if (!currentVideo) return;

        // Only poll if video is still processing (any of these are false)
        const isStillProcessing =
          !currentVideo.transcodingFinished || // transcoding not done
          !currentVideo.captionsFinished || // captions not done
          !currentVideo.censorFinished; // censoring not done

        if (isStillProcessing) {
          await fetchLatestVideoById(id);
        } else {
          // All processing complete - stop polling
          console.log(`✅ Video ${id} processing complete - stopping polling`);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }, 3000);
    }

    // Cleanup function
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [id, fetchLatestVideoById, isProcessingComplete]);

  const handleRefresh = async () => {
    if (id) {
      setLoading(true);
      await fetchLatestVideoById(id);
      setLoading(false);
    }
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
                ❌ Error loading video: {error}
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

  // Show YouTube-like player when processing is complete
  if (isProcessingComplete) {
    return <YouTubeVideoPlayer video={video} onBack={handleBack} />;
  }

  // Show processing status when not complete
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
            <h1 className="text-gray-900 text-3xl font-bold">
              Processing Video
            </h1>
            <button
              onClick={handleRefresh}
              className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-all duration-200 flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Processing Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Your video is being processed
              </h2>
              <p className="text-gray-600 mb-6">
                Please wait while we prepare your video for streaming. This
                usually takes a few minutes.
              </p>
            </div>
          </div>

          {/* Video Info Card */}
          <div className="mb-8">
            <VideoInfo video={video} />
          </div>

          {/* Pipeline Component - Show processing details */}
          <VideoPipeline video={video} videoName={video.videoName} />
        </div>
      </main>
    </div>
  );
};

export default VideoDetails;
