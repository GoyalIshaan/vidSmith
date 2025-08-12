import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import type { Video } from "../types/graphql";

interface VideoPlayerProps {
  video: Video;
  onReady?: (player: HTMLVideoElement) => void;
  className?: string;
  debug?: boolean;
}

// -------- Platform detection --------
const platformDetection = {
  supportsNativeHLS: (): boolean => {
    const v = document.createElement("video");
    // Safari/iOS return "probably" or "maybe"; other browsers usually ""
    return v.canPlayType("application/vnd.apple.mpegurl") !== "";
  },
  isApplePlatform: (): boolean => {
    const ua = navigator.userAgent;
    // Any iOS browser is WebKit (thus native HLS); macOS Safari too
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (/Safari\//.test(ua) && !/Chrome\//.test(ua))
    );
  },
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onReady,
  className = "",
  debug = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategy, setStrategy] = useState<"native-hls" | "hls-js" | "">("");

  // -------- Environment validation --------
  const CDN_BASE_URL = (
    import.meta as ImportMeta & { env?: Record<string, string> }
  ).env?.VITE_CDN_BASE_URL;

  // -------- URLs --------
  const getStreamingUrls = useCallback(() => {
    const base = CDN_BASE_URL.replace(/\/$/, "");

    // Only proceed if required keys are present
    if (!video.manifestKey) {
      return null;
    }

    return {
      hls: `${base}/${video.manifestKey}`,
      captions: video.captionsKey ? `${base}/${video.captionsKey}` : null,
    };
  }, [video, CDN_BASE_URL]);

  // -------- Helpers --------
  const log = useCallback(
    (...args: unknown[]) => debug && console.log("[VideoPlayer]", ...args),
    [debug]
  );
  const warn = useCallback(
    (...args: unknown[]) => debug && console.warn("[VideoPlayer]", ...args),
    []
  );
  const err = useCallback(
    (...args: unknown[]) => console.error("[VideoPlayer]", ...args),
    []
  );

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Common listeners for UX/debug
    const onLoadStart = () => {
      setIsLoading(true);
      setError(null);
      log("loadstart");
    };
    const onCanPlay = () => {
      setIsLoading(false);
      log("canplay");
    };
    const onLoadedMetadata = () =>
      log("loadedmetadata", {
        duration: videoElement.duration,
        w: videoElement.videoWidth,
        h: videoElement.videoHeight,
      });
    const onWaiting = () => log("waiting");
    const onPlaying = () => {
      setIsLoading(false);
      log("playing");
    };
    const onStalled = () => warn("stalled");
    const onError = () => {
      const ve = videoElement.error;
      err("HTMLVideo error", {
        code: ve?.code,
        message: ve?.message,
        networkState: videoElement.networkState,
        readyState: videoElement.readyState,
        currentSrc: videoElement.currentSrc,
      });
      setError(`Video error${ve?.code ? ` (code ${ve.code})` : ""}.`);
      setIsLoading(false);
    };

    videoElement.addEventListener("loadstart", onLoadStart);
    videoElement.addEventListener("canplay", onCanPlay);
    videoElement.addEventListener("loadedmetadata", onLoadedMetadata);
    videoElement.addEventListener("waiting", onWaiting);
    videoElement.addEventListener("playing", onPlaying);
    videoElement.addEventListener("stalled", onStalled);
    videoElement.addEventListener("error", onError);

    // For iOS inline playback
    videoElement.setAttribute("playsinline", "");
    videoElement.setAttribute("webkit-playsinline", "");
    videoElement.preload = "metadata";
    videoElement.controls = true;

    const urls = getStreamingUrls();

    // Early return if no URLs available
    if (!urls) {
      setError("Video manifest not available");
      setIsLoading(false);
      return;
    }

    // ---- Init strategies ----
    const playNativeHls = async () => {
      setStrategy("native-hls");
      log("strategy: native-hls", urls.hls);
      videoElement.src = urls.hls;
      videoElement.load();
      // don't autoplay; leave to user gesture
      onReady?.(videoElement);
    };

    const playHlsJs = async () => {
      setStrategy("hls-js");
      log("strategy: hls-js", urls.hls);

      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: debug,
          enableWorker: true,
          lowLatencyMode: false,
          // Optimize for VOD content
          maxLoadingDelay: 4,
          maxBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
        });

        hls.loadSource(urls.hls);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          log("HLS manifest parsed successfully", hls.levels);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          err("HLS.js error", { event, data });
          if (data.fatal) {
            setError(`HLS error: ${data.type} ${data.details}`);
            setIsLoading(false);
          }
        });

        onReady?.(videoElement);
      } else {
        // Fallback to native HLS
        await playNativeHls();
      }
    };

    // Primary choice
    const start = async () => {
      setError(null);
      setIsLoading(true);
      const apple = platformDetection.isApplePlatform();
      const native = platformDetection.supportsNativeHLS();

      if (apple && native) {
        // Safari: use native HLS
        await playNativeHls();
      } else {
        // Chrome/Firefox: use hls.js for better compatibility
        await playHlsJs();
      }
    };

    start();

    return () => {
      videoElement.removeEventListener("loadstart", onLoadStart);
      videoElement.removeEventListener("canplay", onCanPlay);
      videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
      videoElement.removeEventListener("waiting", onWaiting);
      videoElement.removeEventListener("playing", onPlaying);
      videoElement.removeEventListener("stalled", onStalled);
      videoElement.removeEventListener("error", onError);
    };
  }, [video, onReady, getStreamingUrls, debug, log, warn, err]);

  const urls = getStreamingUrls();

  // Environment validation check
  if (!CDN_BASE_URL) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-red-100 flex items-center justify-center z-20 rounded-lg border border-red-300">
          <div className="text-red-700 text-sm text-center px-4">
            <div className="font-semibold mb-1">Configuration Error</div>
            <div className="opacity-80">
              VITE_CDN_BASE_URL environment variable is not set. Please check
              your .env file.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if required video keys are present
  if (!urls) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-yellow-100 flex items-center justify-center z-20 rounded-lg border border-yellow-300">
          <div className="text-yellow-700 text-sm text-center px-4">
            <div className="font-semibold mb-1">Video Not Ready</div>
            <div className="opacity-80">
              Please wait for processing to complete.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Loading video…</p>
            <p className="text-xs mt-1">Strategy: {strategy || "detecting"}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg">
          <div className="text-red-300 text-sm text-center px-4">
            <div className="font-semibold mb-1">Playback error</div>
            <div className="opacity-80">{error}</div>
          </div>
        </div>
      )}

      <div className="w-full rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          style={{ width: "100%", height: "auto" }}
          preload="metadata"
          controls
        >
          {urls.captions && (
            <track kind="captions" srcLang="en" src={urls.captions} default />
          )}
        </video>
      </div>
    </div>
  );
};

export default VideoPlayer;
