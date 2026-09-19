import { FrameKitError } from "./errors";

export type ExtractionMode = "current" | "interval" | "count";

export interface PlanInput {
  mode: ExtractionMode;
  /** Seconds. Used by all modes; `current` mode uses `current`. */
  start: number;
  end: number;
  /** Seconds between frames (interval mode) */
  interval: number;
  /** Number of frames (count mode) */
  count: number;
  /** Timestamp for `current` mode */
  current: number;
}

const EPSILON = 1e-6;

/** Round to whole milliseconds to avoid float noise like 4.999999. */
export function roundTimestamp(t: number): number {
  return Math.round(t * 1000) / 1000;
}

function assertRange(start: number, end: number): void {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
    throw new FrameKitError("invalid_settings", "Invalid time range");
  }
}

export function planInterval(start: number, end: number, interval: number): number[] {
  assertRange(start, end);
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new FrameKitError("invalid_settings", "Interval must be positive");
  }
  const n = Math.floor((end - start) / interval + EPSILON) + 1;
  return Array.from({ length: n }, (_, i) => roundTimestamp(start + i * interval));
}

export function planCount(start: number, end: number, count: number): number[] {
  assertRange(start, end);
  if (!Number.isInteger(count) || count < 1) {
    throw new FrameKitError("invalid_settings", "Frame count must be at least 1");
  }
  if (count === 1 || end === start) return [roundTimestamp(start)];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => roundTimestamp(start + i * step));
}

export function planTimestamps(input: PlanInput): number[] {
  switch (input.mode) {
    case "current":
      if (!Number.isFinite(input.current) || input.current < 0) {
        throw new FrameKitError("invalid_settings", "Invalid current time");
      }
      return [roundTimestamp(input.current)];
    case "interval":
      return planInterval(input.start, input.end, input.interval);
    case "count":
      return planCount(input.start, input.end, input.count);
  }
}

/** Cheap estimate for the UI; returns 0 when settings are invalid. */
export function estimateFrameCount(input: PlanInput): number {
  const { start, end } = input;
  switch (input.mode) {
    case "current":
      return 1;
    case "interval":
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || start < 0) return 0;
      if (!Number.isFinite(input.interval) || input.interval <= 0) return 0;
      return Math.floor((end - start) / input.interval + EPSILON) + 1;
    case "count":
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || start < 0) return 0;
      return Number.isInteger(input.count) && input.count >= 1 ? input.count : 0;
  }
}

export interface ClampResult {
  timestamps: number[];
  truncated: boolean;
}

export function clampTimestamps(timestamps: number[], maxFrames: number): ClampResult {
  if (timestamps.length <= maxFrames) return { timestamps, truncated: false };
  return { timestamps: timestamps.slice(0, maxFrames), truncated: true };
}
