import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import { FrameKitError, throwIfAborted, toFrameKitError } from "../errors";
import type { DecodedFrame, FrameSource, VideoMetadata } from "../types";

/**
 * Primary engine: mediabunny demuxes MP4/MOV/WebM/MKV in JS and decodes with
 * WebCodecs. Frame-accurate and several times faster than seeking a <video>.
 */
export class WebCodecsSource implements FrameSource {
  readonly kind = "webcodecs" as const;
  private closed = false;

  private constructor(
    private readonly input: Input,
    private readonly sink: CanvasSink,
    readonly metadata: VideoMetadata,
  ) {}

  static async create(file: File): Promise<WebCodecsSource> {
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    try {
      if (!(await input.canRead())) throw new FrameKitError("unsupported_format", "Container not recognised");
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new FrameKitError("no_video_track");
      if (!(await track.canDecode())) {
        throw new FrameKitError("unsupported_codec", (await track.getCodecParameterString()) ?? "unknown codec");
      }
      const [duration, width, height] = await Promise.all([
        input.computeDuration(),
        track.getDisplayWidth(),
        track.getDisplayHeight(),
      ]);
      if (!width || !height) throw new FrameKitError("corrupted_video", "Zero-sized video");
      const sink = new CanvasSink(track, { poolSize: 2 });
      return new WebCodecsSource(input, sink, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        duration,
        width,
        height,
      });
    } catch (e) {
      input.dispose();
      throw toFrameKitError(e, "unsupported_format");
    }
  }

  async getFrame(timestamp: number, signal?: AbortSignal): Promise<ImageBitmap> {
    throwIfAborted(signal);
    if (this.closed) throw new FrameKitError("unknown", "Source closed");
    const t = Math.min(Math.max(timestamp, 0), this.metadata.duration);
    let wrapped;
    try {
      wrapped = await this.sink.getCanvas(t);
    } catch (e) {
      throw toFrameKitError(e, "corrupted_video");
    }
    throwIfAborted(signal);
    if (!wrapped) throw new FrameKitError("corrupted_video", `No frame at ${t}s`);
    return createImageBitmap(wrapped.canvas);
  }

  async *frames(timestamps: readonly number[], signal?: AbortSignal): AsyncIterable<DecodedFrame> {
    throwIfAborted(signal);
    const clamped = timestamps.map((t) => Math.min(Math.max(t, 0), this.metadata.duration));
    let i = 0;
    try {
      for await (const wrapped of this.sink.canvasesAtTimestamps(clamped)) {
        throwIfAborted(signal);
        const timestamp = timestamps[i++];
        if (!wrapped) {
          yield { timestamp, bitmap: null };
          continue;
        }
        // Pooled canvases are reused, so copy immediately.
        yield { timestamp, bitmap: await createImageBitmap(wrapped.canvas) };
      }
    } catch (e) {
      throw toFrameKitError(e, "corrupted_video");
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.input.dispose();
  }
}
