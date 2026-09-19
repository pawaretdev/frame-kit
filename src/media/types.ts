/**
 * Media Processing Layer — framework-agnostic types (REQUIREMENTS §15).
 * Nothing in src/media may import React.
 */

export type OutputFormat = "jpeg" | "png" | "webp";

export const OUTPUT_FORMATS: readonly OutputFormat[] = ["jpeg", "png", "webp"];

export const FORMAT_MIME: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const FORMAT_EXT: Record<OutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

export interface VideoMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Seconds */
  duration: number;
  /** Display width in pixels (after rotation) */
  width: number;
  /** Display height in pixels (after rotation) */
  height: number;
}

export type FrameSourceKind = "webcodecs" | "video-element";

export interface DecodedFrame {
  /** The timestamp that was requested, in seconds */
  timestamp: number;
  /** Null when the source has no frame for that timestamp */
  bitmap: ImageBitmap | null;
}

/**
 * A decoded-frame provider. Implementations: WebCodecsSource (fast, precise)
 * and VideoElementSource (universal fallback). Future tools (GIF, WebP,
 * contact sheet) reuse this interface.
 */
export interface FrameSource {
  readonly kind: FrameSourceKind;
  readonly metadata: VideoMetadata;
  /** Decode a single frame at `timestamp` (seconds). Caller owns the bitmap. */
  getFrame(timestamp: number, signal?: AbortSignal): Promise<ImageBitmap>;
  /** Decode many frames; implementations may optimise sorted timestamps. */
  frames(timestamps: readonly number[], signal?: AbortSignal): AsyncIterable<DecodedFrame>;
  /** Release decoder, object URLs and file handles. */
  close(): void;
}

export interface EncodeOptions {
  format: OutputFormat;
  /** 0..1, used by lossy formats only */
  quality: number;
  /** Longest edge in pixels. Undefined = keep original size. Never upscales. */
  maxEdge?: number;
}

export interface ExtractedFrame {
  id: string;
  /** 1-based, used for the file name */
  index: number;
  /** Seconds */
  timestamp: number;
  fileName: string;
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

export interface ExtractionProgress {
  current: number;
  total: number;
}
