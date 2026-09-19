import { FrameKitError } from "./errors";
import { FORMAT_MIME, type EncodeOptions } from "./types";

export interface EncodeRequest extends EncodeOptions {
  /** Longest edge of the preview thumbnail */
  thumbnailWidth: number;
}

export interface EncodeResult {
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

type CanvasLike = OffscreenCanvas | HTMLCanvasElement;
export type CanvasFactory = (width: number, height: number) => CanvasLike;
export type ToBlob = (canvas: CanvasLike, type: string, quality?: number) => Promise<Blob>;

/** Preserve aspect ratio, never upscale, longest edge <= maxEdge. */
export function fitWithin(width: number, height: number, maxEdge?: number): Size {
  if (!maxEdge || maxEdge <= 0) return { width, height };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function resizeBitmap(bitmap: ImageBitmap, size: Size): Promise<ImageBitmap> {
  if (size.width === bitmap.width && size.height === bitmap.height) return bitmap;
  try {
    const resized = await createImageBitmap(bitmap, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: "high",
    });
    bitmap.close();
    return resized;
  } catch {
    return bitmap; // drawImage will scale instead
  }
}

function draw(canvas: CanvasLike, bitmap: ImageBitmap): void {
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) throw new FrameKitError("encode_failed", "2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
}

/**
 * Resize + encode one frame and produce a small JPEG thumbnail for the grid.
 * Shared by the worker (OffscreenCanvas) and the main-thread fallback.
 */
export async function encodeBitmap(
  bitmap: ImageBitmap,
  req: EncodeRequest,
  createCanvas: CanvasFactory,
  toBlob: ToBlob,
): Promise<EncodeResult> {
  const mime = FORMAT_MIME[req.format];
  const target = fitWithin(bitmap.width, bitmap.height, req.maxEdge);
  const source = await resizeBitmap(bitmap, target);
  try {
    const canvas = createCanvas(target.width, target.height);
    draw(canvas, source);
    const quality = req.format === "png" ? undefined : clamp01(req.quality);
    const blob = await toBlob(canvas, mime, quality);
    if (!blob || blob.size === 0 || (blob.type && blob.type !== mime)) {
      throw new FrameKitError("encode_failed", `Browser produced ${blob?.type || "nothing"} for ${mime}`);
    }

    const thumbSize = fitWithin(target.width, target.height, req.thumbnailWidth);
    const thumbCanvas = createCanvas(thumbSize.width, thumbSize.height);
    draw(thumbCanvas, source);
    const thumbnail = await toBlob(thumbCanvas, "image/jpeg", 0.75);

    return { blob, thumbnail, width: target.width, height: target.height };
  } finally {
    source.close();
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.85));
}
