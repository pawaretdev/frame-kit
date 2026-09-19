import type { Limits } from "@/config/limits";
import { FrameKitError } from "./errors";
import { fileExtension } from "./filename";

/** Containers the browser tiers can read. AVI is intentionally excluded (REQUIREMENTS §4.1 note). */
export const ACCEPTED_EXTENSIONS = ["mp4", "m4v", "mov", "webm", "mkv"] as const;

export const ACCEPT_ATTRIBUTE = ["video/*", ...ACCEPTED_EXTENSIONS.map((e) => `.${e}`)].join(",");

export function validateFile(file: File, limits: Limits): void {
  const ext = fileExtension(file.name);
  const mimeOk = file.type.startsWith("video/");
  const extOk = (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) throw new FrameKitError("unsupported_format", `Rejected ${file.type || ext}`);
  if (ext === "avi" || file.type === "video/x-msvideo" || file.type === "video/avi") {
    throw new FrameKitError("unsupported_format", "AVI is not supported in the browser");
  }
  if (file.size > limits.maxFileSizeMb * 1024 * 1024) {
    throw new FrameKitError("file_too_large", `${file.size} bytes`);
  }
}

export function validateDuration(duration: number, limits: Limits): void {
  if (!Number.isFinite(duration) || duration <= 0) throw new FrameKitError("corrupted_video", "No duration");
  if (duration > limits.maxDurationSec) throw new FrameKitError("video_too_long", `${duration}s`);
}
