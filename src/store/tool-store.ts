import { create } from "zustand";
import { limits } from "@/config/limits";
import { durationBucket, track } from "@/lib/analytics";
import {
  clampTimestamps,
  createFrameSource,
  detectCapabilities,
  downloadFrame,
  downloadFramesAsZip,
  extractFrames,
  FrameKitError,
  planTimestamps,
  roundTimestamp,
  toFrameKitError,
  validateDuration,
  validateFile,
  type Capabilities,
  type EncodeOptions,
  type ExtractedFrame,
  type ExtractionMode,
  type ExtractionProgress,
  type FrameSource,
  type OutputFormat,
  type VideoMetadata,
} from "@/media";

export type ResolutionPreset = "original" | "1920" | "1280" | "720" | "custom";

export interface Settings {
  mode: Exclude<ExtractionMode, "current">;
  start: number;
  end: number;
  interval: number;
  count: number;
  format: OutputFormat;
  /** 0..1 */
  quality: number;
  resolution: ResolutionPreset;
  customWidth: number;
}

export interface FrameItem extends ExtractedFrame {
  thumbnailUrl: string;
}

export type Status = "idle" | "loading" | "ready" | "extracting" | "zipping" | "error";

export interface ToolState {
  status: Status;
  file: File | null;
  /** Object URL for the preview <video> */
  fileUrl: string | null;
  metadata: VideoMetadata | null;
  source: FrameSource | null;
  capabilities: Capabilities | null;
  /** Fatal, file-level error (status === "error") */
  error: FrameKitError | null;
  /** Non-fatal message shown inline (cancelled, timeout, zip failure, invalid settings) */
  notice: FrameKitError | null;
  /** Set when the last extraction was cut to the frame limit */
  truncatedTo: number | null;
  currentTime: number;
  previewAvailable: boolean;
  settings: Settings;
  frames: FrameItem[];
  nextIndex: number;
  progress: ExtractionProgress | null;

  init: () => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  reset: () => void;
  setCurrentTime: (t: number) => void;
  setPreviewAvailable: (available: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  captureCurrent: () => Promise<void>;
  extract: () => Promise<void>;
  cancel: () => void;
  removeFrame: (id: string) => void;
  clearFrames: () => void;
  downloadOne: (id: string) => void;
  downloadAll: () => Promise<void>;
  dismissNotice: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  mode: "interval",
  start: 0,
  end: 0,
  interval: 5,
  count: 10,
  format: "jpeg",
  quality: 0.85,
  resolution: "original",
  customWidth: 1280,
};

let controller: AbortController | null = null;

/** `?engine=video-element` forces the fallback decoder (debugging and tests). */
function engineOverride(): "auto" | "webcodecs" | "video-element" {
  if (typeof window === "undefined") return "auto";
  const value = new URLSearchParams(window.location.search).get("engine");
  return value === "video-element" || value === "webcodecs" ? value : "auto";
}

export function toEncodeOptions(s: Settings): EncodeOptions {
  let maxEdge: number | undefined;
  if (s.resolution === "custom") maxEdge = s.customWidth > 0 ? Math.round(s.customWidth) : undefined;
  else if (s.resolution !== "original") maxEdge = Number(s.resolution);
  return { format: s.format, quality: s.quality, maxEdge };
}

function toItem(frame: ExtractedFrame): FrameItem {
  return { ...frame, thumbnailUrl: URL.createObjectURL(frame.thumbnail) };
}

function sizeBucket(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 10) return "<10MB";
  if (mb < 100) return "10-100MB";
  if (mb < 500) return "100-500MB";
  return ">500MB";
}

export const useToolStore = create<ToolState>((set, get) => {
  const runExtraction = async (timestamps: number[], mode: ExtractionMode) => {
    const { source, settings, frames, nextIndex, metadata } = get();
    if (!source || !metadata) return;
    if (get().status === "extracting" || get().status === "zipping") return;

    const remaining = limits.maxFrames - frames.length;
    if (remaining <= 0) {
      set({ notice: new FrameKitError("too_many_frames", `Limit of ${limits.maxFrames} reached`) });
      return;
    }
    const { timestamps: planned, truncated } = clampTimestamps(timestamps, remaining);

    controller = new AbortController();
    const started = performance.now();
    set({
      status: "extracting",
      notice: null,
      truncatedTo: truncated ? planned.length : null,
      progress: { current: 0, total: planned.length },
    });
    const encode = toEncodeOptions(settings);
    track("extraction_started", {
      mode,
      format: encode.format,
      frame_count: planned.length,
      resolution: settings.resolution,
      engine: source.kind,
    });

    try {
      const result = await extractFrames({
        source,
        timestamps: planned,
        encode,
        startIndex: nextIndex,
        signal: controller.signal,
        timeoutMs: limits.maxProcessingSec * 1000,
        onProgress: (progress) => set({ progress }),
        onFrame: (frame) => set((s) => ({ frames: [...s.frames, toItem(frame)], nextIndex: frame.index + 1 })),
      });
      track("extraction_completed", {
        mode,
        frame_count: result.length,
        engine: source.kind,
        seconds: Math.round((performance.now() - started) / 1000),
      });
      set({ status: "ready", progress: null });
    } catch (e) {
      const err = toFrameKitError(e);
      if (err.code !== "cancelled") track("processing_error", { code: err.code, stage: "extract" });
      set({ status: "ready", progress: null, notice: err });
    } finally {
      controller = null;
    }
  };

  return {
    status: "idle",
    file: null,
    fileUrl: null,
    metadata: null,
    source: null,
    capabilities: null,
    error: null,
    notice: null,
    truncatedTo: null,
    currentTime: 0,
    previewAvailable: true,
    settings: DEFAULT_SETTINGS,
    frames: [],
    nextIndex: 1,
    progress: null,

    init: async () => {
      if (get().capabilities) return;
      const capabilities = await detectCapabilities();
      set((s) => ({
        capabilities,
        settings: !capabilities.webpEncode && s.settings.format === "webp" ? { ...s.settings, format: "jpeg" } : s.settings,
      }));
    },

    loadFile: async (file) => {
      get().reset();
      try {
        validateFile(file, limits);
      } catch (e) {
        const err = toFrameKitError(e);
        track("processing_error", { code: err.code, stage: "validate" });
        set({ status: "error", error: err, file });
        return;
      }

      const fileUrl = URL.createObjectURL(file);
      set({ status: "loading", file, fileUrl, error: null, previewAvailable: true });
      track("upload_started", { size_bucket: sizeBucket(file.size) });

      try {
        const source = await createFrameSource(file, { prefer: engineOverride() });
        if (get().file !== file) {
          source.close(); // user moved on while we were loading
          return;
        }
        try {
          validateDuration(source.metadata.duration, limits);
        } catch (e) {
          source.close();
          throw e;
        }
        const duration = roundTimestamp(source.metadata.duration);
        set((s) => ({
          status: "ready",
          source,
          metadata: source.metadata,
          settings: { ...s.settings, start: 0, end: duration },
        }));
        track("upload_completed", {
          engine: source.kind,
          duration_bucket: durationBucket(duration),
          size_bucket: sizeBucket(file.size),
        });
      } catch (e) {
        if (get().file !== file) return;
        const err = toFrameKitError(e, "unsupported_format");
        track("processing_error", { code: err.code, stage: "load" });
        set({ status: "error", error: err });
      }
    },

    reset: () => {
      controller?.abort();
      controller = null;
      const { source, fileUrl, frames } = get();
      source?.close();
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      for (const f of frames) URL.revokeObjectURL(f.thumbnailUrl);
      set((s) => ({
        status: "idle",
        file: null,
        fileUrl: null,
        metadata: null,
        source: null,
        error: null,
        notice: null,
        truncatedTo: null,
        currentTime: 0,
        previewAvailable: true,
        settings: { ...s.settings, start: 0, end: 0 },
        frames: [],
        nextIndex: 1,
        progress: null,
      }));
    },

    setCurrentTime: (currentTime) => set({ currentTime }),
    setPreviewAvailable: (previewAvailable) => set({ previewAvailable }),

    updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

    captureCurrent: async () => {
      const { currentTime, metadata } = get();
      if (!metadata) return;
      const t = Math.min(Math.max(currentTime, 0), metadata.duration);
      await runExtraction([roundTimestamp(t)], "current");
    },

    extract: async () => {
      const { settings, metadata, currentTime } = get();
      if (!metadata) return;
      let timestamps: number[];
      try {
        timestamps = planTimestamps({
          mode: settings.mode,
          start: settings.start,
          end: Math.min(settings.end, metadata.duration),
          interval: settings.interval,
          count: settings.count,
          current: currentTime,
        });
      } catch (e) {
        set({ notice: toFrameKitError(e, "invalid_settings") });
        return;
      }
      await runExtraction(timestamps, settings.mode);
    },

    cancel: () => {
      controller?.abort();
    },

    removeFrame: (id) => {
      set((s) => {
        const frame = s.frames.find((f) => f.id === id);
        if (frame) URL.revokeObjectURL(frame.thumbnailUrl);
        return { frames: s.frames.filter((f) => f.id !== id) };
      });
    },

    clearFrames: () => {
      for (const f of get().frames) URL.revokeObjectURL(f.thumbnailUrl);
      set({ frames: [], nextIndex: 1, truncatedTo: null, notice: null });
    },

    downloadOne: (id) => {
      const frame = get().frames.find((f) => f.id === id);
      if (!frame) return;
      downloadFrame(frame);
      track("download_single", { format: get().settings.format });
    },

    downloadAll: async () => {
      const { frames, status } = get();
      if (frames.length === 0 || status !== "ready") return;
      set({ status: "zipping", notice: null });
      try {
        const saved = await downloadFramesAsZip(frames);
        if (saved) track("download_all", { frame_count: frames.length });
      } catch (e) {
        const err = toFrameKitError(e, "zip_failed");
        track("processing_error", { code: err.code, stage: "zip" });
        set({ notice: err });
      } finally {
        set({ status: "ready" });
      }
    },

    dismissNotice: () => set({ notice: null, truncatedTo: null }),

  };
});
