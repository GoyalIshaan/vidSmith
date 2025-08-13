import React, { useEffect, useRef } from "react";
import VideoCard from "../components/VideoCard";
import { usePageTitle } from "../hooks/usePageTitle";
import { useVideoStore } from "../store/videoStore";

const Home: React.FC = () => {
  usePageTitle("Home");

  // Use Zustand store for all video data
  const { videos, loading, error, fetchVideos, refetchVideos, isDataStale } =
    useVideoStore();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Fetch videos when component mounts
    fetchVideos();

    // Set up automatic refresh every 2 minutes to check if data is stale
    const checkAndRefresh = () => {
      if (isDataStale()) {
        console.log("🔄 Data is stale, automatically fetching fresh videos...");
        fetchVideos();
      }
    };

    // Check immediately and then every 2 minutes
    intervalRef.current = setInterval(
      checkAndRefresh,
      2 * 60 * 1000
    ) as unknown as number;

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchVideos, isDataStale]);

  const handleRefresh = () => {
    refetchVideos();
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-base">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="text-center p-8 bg-white border border-red-200 rounded-lg max-w-md mx-auto">
          <p className="text-red-500 mb-4 font-medium">
            ❌ Error loading videos: {error}
          </p>
          <button
            onClick={handleRefresh}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none">
      {/* Header section - mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <h2 className="text-gray-500 text-lg font-normal border-b border-gray-300 pb-1 flex-grow">
          All Public Videos
        </h2>
        <button
          onClick={handleRefresh}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 sm:px-4 sm:py-2 rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 self-start sm:self-auto"
        >
          🔄 <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white rounded-xl border-2 border-dashed border-black mx-2 sm:mx-0">
          <div className="text-4xl sm:text-6xl mb-4 opacity-50">📹</div>
          <h3 className="text-black text-lg sm:text-xl font-semibold mb-2 px-4">
            No videos uploaded yet
          </h3>
          <p className="text-black text-sm sm:text-base px-4">
            Upload your first video to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-3 md:gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
