import React, { useEffect, useRef, useState, useCallback } from "react";
import * as dashjs from "dashjs";

interface VideoPlayerProps {
  videoId: string;
  onReady?: (player: dashjs.MediaPlayerClass | HTMLVideoElement) => void;
  className?: string /** Enable verbose console logs */;
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
  debug = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [strategy, setStrategy] = useState<"native-hls" | "dash-js" | "">("");

  // -------- URLs --------
  const getStreamingUrls = useCallback(() => {
    const CDN_BASE_URL =
      (import.meta as any).env?.VITE_CDN_BASE_URL ||
      "https://d25gw4hj3q83sd.cloudfront.net";
    const PACKAGED_PREFIX =
      (import.meta as any).env?.VITE_PACKAGED_PREFIX || "manifests";
    const base = CDN_BASE_URL.replace(/\/$/, "");
    return {
      hls: `${base}/${PACKAGED_PREFIX}/${videoId}/hls/master.m3u8`,
      dash: `${base}/${PACKAGED_PREFIX}/${videoId}/dash/master.mpd`,
    };
  }, [videoId]);

  // -------- Helpers --------
  const log = (...args: any[]) =>
    debug && console.log("[VideoPlayer]", ...args);
  const warn = (...args: any[]) =>
    debug && console.warn("[VideoPlayer]", ...args);
  const err = (...args: any[]) => console.error("[VideoPlayer]", ...args);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;

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
      const ve = (video as any).error;
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

    const playDashJs = async () => {
      setStrategy("dash-js");
      log("strategy: dash-js", urls.dash);
      const dashPlayer = dashjs.MediaPlayer().create();
      playerRef.current = dashPlayer;
      dashPlayer.initialize(video, urls.dash, false);
      try {
        dashPlayer.updateSettings({
          debug: {
            logLevel: debug
              ? dashjs.Debug.LOG_LEVEL_DEBUG
              : dashjs.Debug.LOG_LEVEL_NONE,
          },
          streaming: {
            retryAttempts: {
              MPD: 3,
              XHR: 3,
            },
            retryIntervals: {
              MPD: 500,
              XHR: 1000,
            },
            abandonLoadTimeout: 10000,
            wallclockTimeUpdateInterval: 50,
            manifestUpdateRetryInterval: 100,
          },
          errors: {
            recoverAttempts: {
              mediaErrorDecode: 5,
              mediaErrorNetwork: 5,
            },
          },
        });
      } catch {}
      dashPlayer.on("error", (e: any) => {
        err("dash.js", e);
        setError(`DASH error${e?.error ? `: ${e.error}` : ""}`);
        setIsLoading(false);
      });
      onReady?.(dashPlayer);
    };

    // Primary choice
    const start = async () => {
      setError(null);
      setIsLoading(true);
      const apple = platformDetection.isApplePlatform();
      const native = platformDetection.supportsNativeHLS();

      if (apple && native) {
        await playNativeHls();
      } else {
        await playDashJs();
      }
    };

    start();

    return () => {
      destroyed = true;
      try {
        const p = playerRef.current;
        if (p && typeof (p as any).reset === "function") {
          (p as any).reset();
        }
      } catch (e) {
        warn("cleanup error", e);
      } finally {
        playerRef.current = null;
      }

      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("error", onError);
    };
  }, [videoId, onReady, getStreamingUrls, debug]);

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
        />
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Adaptive streaming • {strategy || "auto"} •{" "}
        {platformDetection.isApplePlatform()
          ? "Apple platform"
          : "Cross‑platform"}
      </div>
    </div>
  );
};

export default VideoPlayer;
