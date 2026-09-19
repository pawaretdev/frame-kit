import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration, parseTimestamp } from "./format";

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatDuration(95)).toBe("01:35");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(14.25, { ms: true })).toBe("00:14.250");
    expect(formatDuration(NaN)).toBe("—");
  });
});

describe("parseTimestamp", () => {
  it("accepts seconds, mm:ss and h:mm:ss", () => {
    expect(parseTimestamp("90")).toBe(90);
    expect(parseTimestamp("12.5")).toBe(12.5);
    expect(parseTimestamp("1:30")).toBe(90);
    expect(parseTimestamp("01:02:03")).toBe(3723);
    expect(parseTimestamp("00:14.250")).toBe(14.25);
  });

  it("rejects garbage", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
    expect(parseTimestamp("1:2:3:4")).toBeNull();
    expect(parseTimestamp("-5")).toBeNull();
  });
});
