import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoId: string;
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
  videoId,
  onReady,
  className = "",
  debug = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategy, setStrategy] = useState<"native-hls" | "hls-js" | "">("");

  // -------- URLs --------
  const getStreamingUrls = useCallback(() => {
    const CDN_BASE_URL =
      (import.meta as ImportMeta & { env?: Record<string, string> }).env
        ?.VITE_CDN_BASE_URL || "https://d25gw4hj3q83sd.cloudfront.net";
    const TRANSCODED_PREFIX =
      (import.meta as ImportMeta & { env?: Record<string, string> }).env
        ?.VITE_TRANSCODED_PREFIX || "transcoded";
    const base = CDN_BASE_URL.replace(/\/$/, "");
    return {
      hls: `${base}/${TRANSCODED_PREFIX}/${videoId}/master.m3u8`,
    };
  }, [videoId]);

  // -------- Helpers --------
  const log = useCallback(
    (...args: unknown[]) => debug && console.log("[VideoPlayer]", ...args),
    [debug]
  );
  const warn = useCallback(
    (...args: unknown[]) => debug && console.warn("[VideoPlayer]", ...args),
    [debug]
  );
  const err = useCallback(
    (...args: unknown[]) => console.error("[VideoPlayer]", ...args),
    []
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
        duration: video.duration,
        w: video.videoWidth,
        h: video.videoHeight,
      });
    const onWaiting = () => log("waiting");
    const onPlaying = () => {
      setIsLoading(false);
      log("playing");
    };
    const onStalled = () => warn("stalled");
    const onError = () => {
      const ve = video.error;
      err("HTMLVideo error", {
        code: ve?.code,
        message: ve?.message,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc,
      });
      setError(`Video error${ve?.code ? ` (code ${ve.code})` : ""}.`);
      setIsLoading(false);
    };

    video.addEventListener("loadstart", onLoadStart);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("error", onError);

    // For iOS inline playback
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "metadata";
    video.controls = true;

    const urls = getStreamingUrls();

    // ---- Init strategies ----
    const playNativeHls = async () => {
      setStrategy("native-hls");
      log("strategy: native-hls", urls.hls);
      video.src = urls.hls;
      video.load();
      // don't autoplay; leave to user gesture
      onReady?.(video);
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
        hls.attachMedia(video);

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

        onReady?.(video);
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
      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("error", onError);
    };
  }, [videoId, onReady, getStreamingUrls, debug, log, warn, err]);

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
          <track
            kind="captions"
            srcLang="en"
            src={`https://d25gw4hj3q83sd.cloudfront.net/captions/vtt/${videoId}.vtt`}
            default
          />
        </video>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        HLS Adaptive Streaming • {strategy || "auto"} •{" "}
        {platformDetection.isApplePlatform()
          ? "Apple platform"
          : "Cross‑platform"}
      </div>
    </div>
  );
};

export default VideoPlayer;
