import { hasWebCodecs } from "../capabilities";
import { FrameKitError, isFrameKitError, toFrameKitError } from "../errors";
import type { FrameSource, FrameSourceKind } from "../types";
import { VideoElementSource } from "./video-element";
import { WebCodecsSource } from "./webcodecs";

export interface CreateSourceOptions {
  /** Force an engine (mainly for tests). Default: WebCodecs when available, else <video>. */
  prefer?: FrameSourceKind | "auto";
}

/**
 * Pick the best decoder for this browser + file. Tries WebCodecs first and falls
 * back to the <video> element; the most specific error wins if both fail.
 */
export async function createFrameSource(file: File, options: CreateSourceOptions = {}): Promise<FrameSource> {
  const prefer = options.prefer ?? "auto";
  let webCodecsError: FrameKitError | null = null;

  if (prefer !== "video-element" && hasWebCodecs()) {
    try {
      return await WebCodecsSource.create(file);
    } catch (e) {
      webCodecsError = toFrameKitError(e, "unsupported_format");
      if (prefer === "webcodecs") throw webCodecsError;
      console.warn("[framekit] WebCodecs source unavailable, falling back to <video>:", webCodecsError.message);
    }
  }

  try {
    return await VideoElementSource.create(file);
  } catch (e) {
    const elementError = toFrameKitError(e, "unsupported_format");
    if (webCodecsError && isFrameKitError(webCodecsError) && webCodecsError.code !== "unknown") {
      throw webCodecsError;
    }
    throw elementError;
  }
}

export { VideoElementSource, WebCodecsSource };
