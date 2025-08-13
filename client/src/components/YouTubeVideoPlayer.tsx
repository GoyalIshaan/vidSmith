import React from "react";
import VideoPlayer from "./VideoPlayer";
import type { Video } from "../types/graphql";

interface YouTubeVideoPlayerProps {
  video: Video;
  onBack: () => void;
}

const YouTubeVideoPlayer: React.FC<YouTubeVideoPlayerProps> = ({
  video,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar - YouTube style */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors duration-200 group"
              >
                <div className="p-2 rounded-full group-hover:bg-gray-100 transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </div>
                <span className="hidden sm:inline font-medium">
                  Back to Videos
                </span>
              </button>
            </div>

            <div className="flex-1 max-w-3xl mx-4">
              <h1 className="text-lg font-semibold text-gray-900 truncate text-center px-4">
                {video.videoName}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ready</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Video Container */}
      <div className="bg-black">
        <div className="max-w-screen-2xl mx-auto">
          {/* Video Player */}
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <VideoPlayer
              video={video}
              className="w-full h-full"
              onReady={() => {
                console.log("YouTube-style player ready");
              }}
              debug={false}
            />
          </div>
        </div>
      </div>

      {/* Video Information Section - YouTube style */}
      <div className="bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Main Video Info */}
            <div className="flex-1">
              {/* Video Title and Stats */}
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-gray-900 mb-3 leading-tight">
                  {video.videoName}
                </h1>

                {/* Video Stats Row */}
                <div className="flex flex-wrap items-center justify-between mb-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {video.videoDuration
                        ? `${Math.round(video.videoDuration)}s`
                        : "Unknown duration"}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Processing Status Badges - Subtle YouTube style */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    HD Transcoded
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Subtitles Available
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Content Verified
                  </span>
                </div>

                {/* Video Description/Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Video Details
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span>Adaptive (up to 1080p)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span>HLS Streaming</span>
                    </div>
                    {video.manifestKey && (
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <span className="text-green-600">Optimized</span>
                      </div>
                    )}
                    {video.captionsKey && (
                      <div className="flex justify-between">
                        <span>Captions:</span>
                        <span className="text-green-600">Available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - YouTube style */}
            <div className="xl:w-80">
              <div className="space-y-4">
                {/* Playback Info Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h3m10 0a2 2 0 01-2 2H9m10 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2z"
                      />
                    </svg>
                    Streaming Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Quality:</span>
                      <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        Auto (HD)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium text-gray-900">HLS</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Speed:</span>
                      <span className="font-medium text-gray-900">1x</span>
                    </div>
                    {video.captionsKey && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-600">Subtitles:</span>
                        <span className="font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Available
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Details Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Technical Details
                  </h3>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between items-center">
                      <span>Resolution:</span>
                      <span className="text-gray-900 font-medium">
                        Up to 1080p
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Codec:</span>
                      <span className="text-gray-900 font-medium">H.264</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Adaptive Bitrate:</span>
                      <span className="text-green-600 font-medium">
                        ✓ Enabled
                      </span>
                    </div>
                    {video.manifestKey && (
                      <div className="flex justify-between items-center">
                        <span>Storage:</span>
                        <span className="text-green-600 font-medium">
                          ✓ Optimized
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeVideoPlayer;
