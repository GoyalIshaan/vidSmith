import type { Video } from "../types/graphql";

export interface VideoStatus {
  code: number;
  text: string;
  icon: string;
  badgeClass: string;
}

/**
 * Determines the video processing status based on boolean completion flags
 * @param video - Video object with boolean completion flags
 * @returns VideoStatus object with code, text, icon, and badge class
 */
export function getVideoStatus(video: Video): VideoStatus {
  const { transcodingFinished, captionsFinished, censorFinished } = video;

  const baseClasses =
    "px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1";

  // All processing complete
  if (transcodingFinished && captionsFinished && censorFinished) {
    return {
      code: 6,
      text: "READY",
      icon: "✅",
      badgeClass: `${baseClasses} bg-green-500`,
    };
  }

  // Captioning and censoring done, transcoding may or may not be done
  if (captionsFinished && censorFinished) {
    return {
      code: 5,
      text: "PROCESSING FINAL",
      icon: "🔍",
      badgeClass: `${baseClasses} bg-purple-500`,
    };
  }

  // Transcoding and censoring done, captioning may have failed/skipped
  if (transcodingFinished && censorFinished && !captionsFinished) {
    return {
      code: 4,
      text: "PARTIAL PROCESSING",
      icon: "🔨",
      badgeClass: `${baseClasses} bg-amber-500`,
    };
  }

  // Transcoding and captioning done, censoring in progress
  if (transcodingFinished && captionsFinished && !censorFinished) {
    return {
      code: 3,
      text: "CENSORING",
      icon: "📝",
      badgeClass: `${baseClasses} bg-blue-500`,
    };
  }

  // Only captioning done
  if (captionsFinished && !transcodingFinished && !censorFinished) {
    return {
      code: 2,
      text: "CAPTIONING DONE",
      icon: "📝",
      badgeClass: `${baseClasses} bg-yellow-500`,
    };
  }

  // Only transcoding done
  if (transcodingFinished && !captionsFinished && !censorFinished) {
    return {
      code: 1,
      text: "TRANSCODING DONE",
      icon: "🔄",
      badgeClass: `${baseClasses} bg-orange-500`,
    };
  }

  // Just uploaded, no processing done yet
  return {
    code: 0,
    text: "UPLOADED",
    icon: "⏳",
    badgeClass: `${baseClasses} bg-gray-500`,
  };
}

/**
 * Gets the status badge class for large components (like VideoInfo)
 */
export function getVideoStatusLarge(video: Video): VideoStatus {
  const status = getVideoStatus(video);

  return {
    ...status,
    badgeClass: status.badgeClass
      .replace("px-3 py-1", "px-4 py-2")
      .replace("text-xs", "text-sm")
      .replace("gap-1", "gap-2"),
  };
}
