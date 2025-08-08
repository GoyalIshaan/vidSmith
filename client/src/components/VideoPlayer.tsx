import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";

interface VideoPlayerProps {
  videoId: string;
  onReady?: (player: Hls | any | HTMLVideoElement) => void;
  className?: string;
}

// Platform detection utilities
const platformDetection = {
  // Check if browser supports native HLS (Safari, iOS)
  supportsNativeHLS: () => {
    const video = document.createElement("video");
    return video.canPlayType("application/vnd.apple.mpegurl") !== "";
  },

  // Check if we're on Safari/iOS (prefer HLS)
  isSafariOrIOS: () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return (
      (userAgent.includes("safari") && !userAgent.includes("chrome")) ||
      userAgent.includes("iphone") ||
      userAgent.includes("ipad") ||
      userAgent.includes("ipod")
    );
  },

  // Check if hls.js is supported
  supportsHlsJs: () => {
    return Hls.isSupported();
  },

  // Determine the best streaming strategy
  getStreamingStrategy: () => {
    // Safari/iOS: TEMPORARILY use HLS.js instead of native to test .m4s compatibility
    if (platformDetection.isSafariOrIOS()) {
      if (platformDetection.supportsHlsJs()) {
        return "hls-js"; // Test HLS.js on Safari instead of native
      } else if (platformDetection.supportsNativeHLS()) {
        return "native-hls";
      }
      return "unsupported";
    }

    // Other browsers: Prefer DASH, fallback to hls.js
    if (platformDetection.supportsHlsJs()) {
      return "dash-js";
    }

    return "unsupported";
  },
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onReady,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Hls | any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategy, setStrategy] = useState<string>("");

  // Construct streaming URLs
  const getStreamingUrls = useCallback(() => {
    const CDN_BASE_URL =
      import.meta.env.VITE_CDN_BASE_URL ||
      "https://d25gw4hj3q83sd.cloudfront.net";
    const PACKAGED_PREFIX = import.meta.env.VITE_PACKAGED_PREFIX || "manifests";

    return {
      hls: `${CDN_BASE_URL}/${PACKAGED_PREFIX}/${videoId}/hls/master.m3u8`,
      dash: `${CDN_BASE_URL}/${PACKAGED_PREFIX}/${videoId}/dash/master.mpd`,
    };
  }, [videoId]);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const urls = getStreamingUrls();
    const streamingStrategy = platformDetection.getStreamingStrategy();
    setStrategy(streamingStrategy);

    console.log("🎬 Video Player Strategy:", streamingStrategy);
    console.log("📺 HLS URL:", urls.hls);
    console.log("🎯 DASH URL:", urls.dash);
    console.log("🌐 User Agent:", navigator.userAgent);

    let currentPlayer: Hls | any | null = null;

    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Common video event handlers with more debugging
        const handleLoadStart = () => {
          setIsLoading(true);
          setError(null);
          console.log("🔄 Loading started");
        };

        const handleCanPlay = () => {
          setIsLoading(false);
          console.log("✅ Video ready to play");
        };

        const handleLoadedMetadata = () => {
          console.log("📊 Video metadata loaded", {
            duration: video.duration,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          });
        };

        const handleProgress = () => {
          console.log("📈 Video loading progress", {
            buffered: video.buffered.length > 0 ? video.buffered.end(0) : 0,
            duration: video.duration,
          });
        };

        const handleWaiting = () => {
          console.log("⏳ Video waiting for data");
        };

        const handlePlaying = () => {
          setIsLoading(false);
          console.log("▶️ Video started playing");
        };

        const handleStalled = () => {
          console.warn("😫 Video stalled");
        };

        const handleSuspend = () => {
          console.log("⏸️ Video loading suspended");
        };

        const handleAbort = () => {
          console.warn("🚫 Video loading aborted");
        };

        const handleError = () => {
          console.error("❌ Video error occurred:", {
            error: video.error,
            networkState: video.networkState,
            readyState: video.readyState,
            src: video.src,
            currentSrc: video.currentSrc,
          });
          setError(
            `Video playback failed: ${video.error?.message || "Unknown error"}`
          );
          setIsLoading(false);
        };

        // Add comprehensive event listeners
        video.addEventListener("loadstart", handleLoadStart);
        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("progress", handleProgress);
        video.addEventListener("waiting", handleWaiting);
        video.addEventListener("playing", handlePlaying);
        video.addEventListener("stalled", handleStalled);
        video.addEventListener("suspend", handleSuspend);
        video.addEventListener("abort", handleAbort);
        video.addEventListener("error", handleError);

        // Log initial video element state
        console.log("📺 Video element state:", {
          readyState: video.readyState,
          networkState: video.networkState,
          src: video.src,
          currentSrc: video.currentSrc,
        });

        // Set a timeout to detect stuck loading
        const loadingTimeout = setTimeout(() => {
          console.warn(
            "⏰ Video loading timeout - still loading after 30 seconds"
          );
          if (isLoading) {
            setError(
              "Video loading timed out. Please try refreshing the page."
            );
            setIsLoading(false);
          }
        }, 30000);

        switch (streamingStrategy) {
          case "native-hls":
            console.log("🍎 Using Native HLS (Safari/iOS)");
            video.src = urls.hls;
            currentPlayer = video; // Use the video element itself
            if (onReady) onReady(video);
            break;

          case "hls-js":
            console.log("📱 Using HLS.js");
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
              });

              hls.loadSource(urls.hls);
              hls.attachMedia(video);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("✅ HLS manifest parsed");
                const levels = hls.levels;
                console.log(`🎚️ Available qualities: ${levels.length}`);
                levels.forEach((level, index) => {
                  console.log(
                    `   ${index}: ${level.height}p - ${Math.round(
                      level.bitrate / 1000
                    )}kbps`
                  );
                });
              });

              hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("❌ HLS.js error:", data);
                if (data.fatal) {
                  setError(`HLS Error: ${data.details}`);
                  setIsLoading(false);
                }
              });

              currentPlayer = hls;
              playerRef.current = hls;
              if (onReady) onReady(hls);
            } else {
              throw new Error("HLS.js not supported");
            }
            break;

          case "dash-js": {
            console.log("🎯 Using DASH.js");
            console.log("🎯 DASH URL being passed:", urls.dash);

            // Test if DASH manifest is accessible
            try {
              const response = await fetch(urls.dash);
              console.log(
                "🎯 DASH manifest fetch response:",
                response.status,
                response.statusText
              );
              if (!response.ok) {
                console.error(
                  "❌ DASH manifest not accessible:",
                  response.status
                );
                throw new Error(`DASH manifest not found: ${response.status}`);
              }
              const manifestText = await response.text();
              console.log(
                "🎯 DASH manifest content (first 200 chars):",
                manifestText.substring(0, 200)
              );
              console.log("🎯 Full DASH manifest content:", manifestText);
            } catch (fetchError) {
              console.error("❌ Failed to fetch DASH manifest:", fetchError);
              throw fetchError;
            }

            const dashPlayer = (dashjs as any).MediaPlayer().create();

            console.log("🎯 Initializing DASH player with URL:", urls.dash);
            dashPlayer.initialize(video, urls.dash, false);

            // Enable debug logging if available
            try {
              dashPlayer.getDebug()?.setLogToBrowserConsole?.(true);
            } catch (debugError) {
              console.warn("Debug logging not available:", debugError);
            }

            dashPlayer.on("error", (e: any) => {
              console.error("❌ DASH.js error:", e);
              setError(`DASH Error: ${e.error || "Unknown DASH error"}`);
              setIsLoading(false);
            });

            dashPlayer.on("streamInitialized", () => {
              console.log("✅ DASH stream initialized");
              try {
                const qualities =
                  dashPlayer.getBitrateInfoListFor?.("video") || [];
                console.log(`🎚️ Available qualities: ${qualities.length}`);
                qualities.forEach((quality: any, index: number) => {
                  console.log(
                    `   ${index}: ${
                      quality.height || "unknown"
                    }p - ${Math.round((quality.bitrate || 0) / 1000)}kbps`
                  );
                });
              } catch (qualityError) {
                console.warn("Could not get quality info:", qualityError);
              }
            });

            currentPlayer = dashPlayer;
            playerRef.current = dashPlayer;
            if (onReady) onReady(dashPlayer);
            break;
          }

          default:
            setError("Your browser doesn't support adaptive streaming");
            setIsLoading(false);
            return;
        }

        // Cleanup function
        return () => {
          clearTimeout(loadingTimeout);
          video.removeEventListener("loadstart", handleLoadStart);
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          video.removeEventListener("progress", handleProgress);
          video.removeEventListener("waiting", handleWaiting);
          video.removeEventListener("playing", handlePlaying);
          video.removeEventListener("stalled", handleStalled);
          video.removeEventListener("suspend", handleSuspend);
          video.removeEventListener("abort", handleAbort);
          video.removeEventListener("error", handleError);
        };
      } catch (initError) {
        console.error("Failed to initialize player:", initError);
        setError(`Failed to initialize video player: ${initError}`);
        setIsLoading(false);
      }
    };

    const cleanupPromise = initializePlayer();

    // Cleanup function
    return () => {
      if (currentPlayer) {
        if (currentPlayer instanceof Hls) {
          currentPlayer.destroy();
        } else if (currentPlayer && typeof currentPlayer.reset === "function") {
          // DASH player cleanup
          currentPlayer.reset();
        }
      }
      playerRef.current = null;

      // Wait for cleanup promise to resolve
      cleanupPromise?.then?.((cleanup) => cleanup?.());
    };
  }, [videoId, onReady, getStreamingUrls, isLoading]);

  if (error) {
    return (
      <div
        className={`bg-gray-100 border border-red-500 rounded-lg p-8 text-center ${className}`}
      >
        <div className="text-red-500 text-lg font-semibold mb-2">
          ❌ Video Player Error
        </div>
        <p className="text-gray-700 mb-4">{error}</p>
        <div className="text-xs text-gray-500 mb-4">
          Strategy: {strategy} | Platform:{" "}
          {navigator.userAgent.includes("Safari") ? "Safari" : "Other"}
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            window.location.reload();
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Loading video...</p>
            <p className="text-xs mt-1">Strategy: {strategy}</p>
          </div>
        </div>
      )}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={{ backgroundColor: "#000" }}
      >
        <video
          ref={videoRef}
          controls
          style={{ width: "100%", height: "auto" }}
          preload="metadata"
          poster={undefined}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Adaptive streaming • {strategy} •{" "}
        {platformDetection.isSafariOrIOS()
          ? "Safari/iOS optimized"
          : "Cross-platform"}
      </div>
    </div>
  );
};

export default VideoPlayer;
