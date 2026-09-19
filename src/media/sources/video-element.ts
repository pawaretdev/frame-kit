import { FrameKitError, throwIfAborted } from "../errors";
import type { DecodedFrame, FrameSource, VideoMetadata } from "../types";

const LOAD_TIMEOUT_MS = 30_000;
const SEEK_TIMEOUT_MS = 15_000;
const PRESENT_TIMEOUT_MS = 250;

/**
 * Universal fallback: seeks a hidden <video> element and copies the presented
 * frame. Works wherever the browser can play the file. Slower than WebCodecs.
 */
export class VideoElementSource implements FrameSource {
  readonly kind = "video-element" as const;
  private closed = false;

  private constructor(
    private readonly video: HTMLVideoElement,
    private readonly url: string,
    readonly metadata: VideoMetadata,
  ) {}

  static async create(file: File): Promise<VideoElementSource> {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    try {
      await loadMetadata(video, url);
      let duration = video.duration;
      if (!Number.isFinite(duration)) duration = await probeDuration(video);
      if (!video.videoWidth || !video.videoHeight) throw new FrameKitError("no_video_track");
      const metadata: VideoMetadata = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      return new VideoElementSource(video, url, metadata);
    } catch (e) {
      releaseVideo(video, url);
      throw e;
    }
  }

  async getFrame(timestamp: number, signal?: AbortSignal): Promise<ImageBitmap> {
    throwIfAborted(signal);
    if (this.closed) throw new FrameKitError("unknown", "Source closed");
    const t = Math.min(Math.max(timestamp, 0), this.metadata.duration);
    await seek(this.video, t, signal);
    await waitForPresentedFrame(this.video);
    throwIfAborted(signal);
    return grabFrame(this.video);
  }

  async *frames(timestamps: readonly number[], signal?: AbortSignal): AsyncIterable<DecodedFrame> {
    for (const timestamp of timestamps) {
      yield { timestamp, bitmap: await this.getFrame(timestamp, signal) };
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    releaseVideo(this.video, this.url);
  }
}

function releaseVideo(video: HTMLVideoElement, url: string): void {
  try {
    video.pause();
    video.removeAttribute("src");
    video.load();
  } catch {
    // ignore
  }
  URL.revokeObjectURL(url);
}

function mapElementError(video: HTMLVideoElement): FrameKitError {
  const code = video.error?.code;
  // MEDIA_ERR_SRC_NOT_SUPPORTED = 4, MEDIA_ERR_DECODE = 3
  if (code === 4) return new FrameKitError("unsupported_format", video.error?.message);
  if (code === 3) return new FrameKitError("corrupted_video", video.error?.message);
  return new FrameKitError("unknown", video.error?.message);
}

function loadMetadata(video: HTMLVideoElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new FrameKitError("processing_timeout", "Timed out reading video metadata"));
    }, LOAD_TIMEOUT_MS);
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(mapElementError(video));
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    video.src = url;
  });
}

/**
 * Files recorded by MediaRecorder (and some streamed MP4s) report Infinity as
 * duration. Seeking far past the end forces the browser to resolve it.
 */
async function probeDuration(video: HTMLVideoElement): Promise<number> {
  const resolved = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new FrameKitError("corrupted_video", "Could not determine duration"));
    }, LOAD_TIMEOUT_MS);
    const check = () => {
      if (Number.isFinite(video.duration)) {
        cleanup();
        resolve(video.duration);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("durationchange", check);
      video.removeEventListener("seeked", check);
    };
    video.addEventListener("durationchange", check);
    video.addEventListener("seeked", check);
    video.currentTime = Number.MAX_SAFE_INTEGER;
  });
  await seek(video, 0);
  return resolved;
}

function seek(video: HTMLVideoElement, t: number, signal?: AbortSignal): Promise<void> {
  if (Math.abs(video.currentTime - t) < 0.0005 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new FrameKitError("processing_timeout", `Seek to ${t}s timed out`));
    }, SEEK_TIMEOUT_MS);
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(mapElementError(video));
    };
    const onAbort = () => {
      cleanup();
      reject(new FrameKitError("cancelled"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);
    video.currentTime = t;
  });
}

/** After `seeked`, give the compositor a chance to present the new frame. */
function waitForPresentedFrame(video: HTMLVideoElement): Promise<void> {
  if (!("requestVideoFrameCallback" in video)) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, PRESENT_TIMEOUT_MS);
    video.requestVideoFrameCallback(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function grabFrame(video: HTMLVideoElement): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(video);
  } catch {
    // Safari fallback: draw through a canvas first.
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new FrameKitError("unknown", "2D context unavailable");
    ctx.drawImage(video, 0, 0);
    return createImageBitmap(canvas);
  }
}
