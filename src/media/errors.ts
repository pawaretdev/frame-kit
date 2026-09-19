export type FrameKitErrorCode =
  | "unsupported_format"
  | "unsupported_codec"
  | "no_video_track"
  | "corrupted_video"
  | "file_too_large"
  | "video_too_long"
  | "too_many_frames"
  | "invalid_settings"
  | "processing_timeout"
  | "out_of_memory"
  | "encode_failed"
  | "zip_failed"
  | "cancelled"
  | "unknown";

export class FrameKitError extends Error {
  readonly code: FrameKitErrorCode;

  constructor(code: FrameKitErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code, options);
    this.name = "FrameKitError";
    this.code = code;
  }
}

export function isFrameKitError(e: unknown): e is FrameKitError {
  return e instanceof FrameKitError || (typeof e === "object" && e !== null && (e as { name?: string }).name === "FrameKitError");
}

/** Convert any thrown value into a FrameKitError without leaking internals to users. */
export function toFrameKitError(e: unknown, fallback: FrameKitErrorCode = "unknown"): FrameKitError {
  if (isFrameKitError(e)) return e;
  const name = typeof e === "object" && e !== null ? (e as { name?: string }).name : undefined;
  const message = e instanceof Error ? e.message : String(e);

  if (name === "AbortError") return new FrameKitError("cancelled", message, { cause: e });
  if (name === "QuotaExceededError") return new FrameKitError("out_of_memory", message, { cause: e });
  if (name === "EncodingError") return new FrameKitError("unsupported_codec", message, { cause: e });
  if (name === "NotSupportedError") return new FrameKitError("unsupported_codec", message, { cause: e });
  if (e instanceof RangeError && /memory|allocat|array buffer/i.test(message)) {
    return new FrameKitError("out_of_memory", message, { cause: e });
  }
  return new FrameKitError(fallback, message, { cause: e });
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new FrameKitError("cancelled");
}

export interface ErrorCopy {
  title: string;
  description: string;
  action: string;
}

/** User-facing copy (REQUIREMENTS §11, §13). Never expose stack traces. */
export const ERROR_COPY: Record<FrameKitErrorCode, ErrorCopy> = {
  unsupported_format: {
    title: "We couldn't read this video.",
    description: "The file format may not be supported. FrameKit works with MP4, MOV, WebM and MKV files. AVI and other formats need to be converted to MP4 first.",
    action: "Choose another video",
  },
  unsupported_codec: {
    title: "This video uses a codec your browser can't decode.",
    description: "Common codecs such as H.264, VP9 and AV1 work in most browsers. Professional formats like ProRes need to be converted to MP4 (H.264) first.",
    action: "Choose another video",
  },
  no_video_track: {
    title: "This file has no video track.",
    description: "It looks like an audio-only file or a container without video.",
    action: "Choose another video",
  },
  corrupted_video: {
    title: "This video looks damaged.",
    description: "We could read the file but couldn't decode its frames. Re-exporting it from your editor usually fixes this.",
    action: "Choose another video",
  },
  file_too_large: {
    title: "This file is too large.",
    description: "Try trimming or compressing the video before extracting frames.",
    action: "Choose another video",
  },
  video_too_long: {
    title: "This video is too long.",
    description: "Trim it to a shorter clip and try again.",
    action: "Choose another video",
  },
  too_many_frames: {
    title: "That would extract too many frames.",
    description: "Increase the interval, reduce the frame count, or narrow the time range.",
    action: "Adjust settings",
  },
  invalid_settings: {
    title: "Please check the extraction settings.",
    description: "The start time must be before the end time, and the interval or frame count must be positive.",
    action: "Adjust settings",
  },
  processing_timeout: {
    title: "Extraction took too long.",
    description: "We stopped to keep your browser responsive. Frames extracted so far are kept. Try a smaller range or fewer frames.",
    action: "Try again",
  },
  out_of_memory: {
    title: "Your browser ran out of memory.",
    description: "Try a smaller output resolution, fewer frames, or close other tabs and try again.",
    action: "Try again",
  },
  encode_failed: {
    title: "We couldn't create the image.",
    description: "Your browser may not support the selected output format. Try JPG or PNG instead.",
    action: "Change format",
  },
  zip_failed: {
    title: "We couldn't build the ZIP file.",
    description: "You can still download frames individually.",
    action: "Try again",
  },
  cancelled: {
    title: "Extraction cancelled.",
    description: "Frames extracted so far are kept.",
    action: "OK",
  },
  unknown: {
    title: "We couldn't process this video.",
    description: "Something unexpected happened. Reloading the page and trying again usually helps.",
    action: "Try again",
  },
};

export function errorCopy(e: unknown): ErrorCopy {
  return ERROR_COPY[toFrameKitError(e).code];
}
