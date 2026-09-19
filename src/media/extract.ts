import { getEncoder } from "./encoder";
import { FrameKitError, throwIfAborted, toFrameKitError } from "./errors";
import { frameFileName } from "./filename";
import type { EncodeOptions, ExtractedFrame, ExtractionProgress, FrameSource } from "./types";

export interface ExtractOptions {
  source: FrameSource;
  timestamps: readonly number[];
  encode: EncodeOptions;
  /** First frame index used for file names (default 1) */
  startIndex?: number;
  /** Longest edge of preview thumbnails (default 320) */
  thumbnailWidth?: number;
  signal?: AbortSignal;
  /** Overall deadline; throws `processing_timeout` when exceeded */
  timeoutMs?: number;
  onProgress?: (progress: ExtractionProgress) => void;
  /** Called as soon as each frame is ready so the UI can show partial results */
  onFrame?: (frame: ExtractedFrame) => void;
}

let idCounter = 0;

/**
 * Orchestrates decode → resize/encode → result. Decoding of frame N+1 overlaps
 * with encoding of frame N in the worker; memory stays bounded to ~2 frames.
 */
export async function extractFrames(options: ExtractOptions): Promise<ExtractedFrame[]> {
  const { source, timestamps, encode, signal, onProgress, onFrame } = options;
  const thumbnailWidth = options.thumbnailWidth ?? 320;
  const deadline = options.timeoutMs ? performance.now() + options.timeoutMs : Infinity;
  const encoder = getEncoder();
  const results: ExtractedFrame[] = [];
  const total = timestamps.length;
  let done = 0;
  let index = options.startIndex ?? 1;
  let pending: Promise<void> | null = null;

  const report = () => onProgress?.({ current: done, total });
  report();

  try {
    for await (const frame of source.frames(timestamps, signal)) {
      throwIfAborted(signal);
      if (performance.now() > deadline) throw new FrameKitError("processing_timeout");
      if (pending) await pending;

      if (!frame.bitmap) {
        done++;
        report();
        continue;
      }

      const myIndex = index++;
      const timestamp = frame.timestamp;
      const job = encoder.encode(frame.bitmap, { ...encode, thumbnailWidth }).then((res) => {
        const extracted: ExtractedFrame = {
          id: `f${++idCounter}`,
          index: myIndex,
          timestamp,
          fileName: frameFileName(myIndex, encode.format),
          blob: res.blob,
          thumbnail: res.thumbnail,
          width: res.width,
          height: res.height,
        };
        results.push(extracted);
        onFrame?.(extracted);
        done++;
        report();
      });
      job.catch(() => {}); // handled when awaited
      pending = job;
    }
    if (pending) await pending;
    return results;
  } catch (e) {
    throw toFrameKitError(e);
  }
}
