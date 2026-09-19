import { describe, expect, it } from "vitest";
import { FrameKitError } from "./errors";
import { clampTimestamps, estimateFrameCount, planCount, planInterval, planTimestamps } from "./planner";

describe("planInterval", () => {
  it("includes both ends when the range divides evenly", () => {
    const ts = planInterval(0, 60, 5);
    expect(ts).toHaveLength(13);
    expect(ts[0]).toBe(0);
    expect(ts.at(-1)).toBe(60);
  });

  it("stops before the end when it does not divide evenly", () => {
    expect(planInterval(0, 10, 3)).toEqual([0, 3, 6, 9]);
  });

  it("tolerates float accumulation", () => {
    const ts = planInterval(0, 1, 0.1);
    expect(ts).toHaveLength(11);
    expect(ts.at(-1)).toBe(1);
    expect(ts[3]).toBe(0.3);
  });

  it("rejects invalid input", () => {
    expect(() => planInterval(10, 5, 1)).toThrow(FrameKitError);
    expect(() => planInterval(0, 5, 0)).toThrow(FrameKitError);
    expect(() => planInterval(-1, 5, 1)).toThrow(FrameKitError);
  });
});

describe("planCount", () => {
  it("distributes frames evenly across the range", () => {
    const ts = planCount(0, 60, 10);
    expect(ts).toHaveLength(10);
    expect(ts[0]).toBe(0);
    expect(ts.at(-1)).toBe(60);
    expect(ts[1]).toBeCloseTo(60 / 9, 3);
  });

  it("returns the start for a single frame or a zero-length range", () => {
    expect(planCount(0, 10, 1)).toEqual([0]);
    expect(planCount(5, 5, 3)).toEqual([5]);
  });

  it("rejects invalid counts", () => {
    expect(() => planCount(0, 10, 0)).toThrow(FrameKitError);
    expect(() => planCount(0, 10, 1.5)).toThrow(FrameKitError);
  });
});

describe("planTimestamps / estimateFrameCount", () => {
  const base = { start: 0, end: 30, interval: 2, count: 7, current: 12.345 };

  it("agree on the number of frames for every mode", () => {
    for (const mode of ["current", "interval", "count"] as const) {
      const input = { ...base, mode };
      expect(planTimestamps(input)).toHaveLength(estimateFrameCount(input));
    }
  });

  it("returns 0 for invalid settings instead of throwing", () => {
    expect(estimateFrameCount({ ...base, mode: "interval", interval: 0 })).toBe(0);
    expect(estimateFrameCount({ ...base, mode: "count", count: 0 })).toBe(0);
    expect(estimateFrameCount({ ...base, mode: "count", end: -1 })).toBe(0);
  });

  it("uses the current time for current mode", () => {
    expect(planTimestamps({ ...base, mode: "current" })).toEqual([12.345]);
  });
});

describe("clampTimestamps", () => {
  it("truncates to the limit and flags it", () => {
    const { timestamps, truncated } = clampTimestamps([1, 2, 3, 4], 2);
    expect(timestamps).toEqual([1, 2]);
    expect(truncated).toBe(true);
  });

  it("leaves short lists alone", () => {
    expect(clampTimestamps([1, 2], 5)).toEqual({ timestamps: [1, 2], truncated: false });
  });
});
