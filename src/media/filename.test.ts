import { describe, expect, it } from "vitest";
import { fileExtension, frameFileName, sanitizeFileName, stripExtension } from "./filename";

describe("frameFileName", () => {
  it("zero-pads to five digits with the right extension", () => {
    expect(frameFileName(1, "jpeg")).toBe("frame-00001.jpg");
    expect(frameFileName(42, "webp")).toBe("frame-00042.webp");
    expect(frameFileName(123456, "png")).toBe("frame-123456.png");
  });
});

describe("sanitizeFileName", () => {
  it("removes path traversal and separators", () => {
    const out = sanitizeFileName("../../etc/passwd");
    expect(out).not.toMatch(/[\\/]/);
    expect(out.startsWith(".")).toBe(false);
  });

  it("strips control characters and reserved characters", () => {
    expect(sanitizeFileName('a\u0000b:c*d?e"f<g>h|i')).toBe("abcdefghi");
  });

  it("falls back when nothing is left", () => {
    expect(sanitizeFileName("...")).toBe("video");
    expect(sanitizeFileName("")).toBe("video");
  });

  it("limits length", () => {
    expect(sanitizeFileName("x".repeat(200), 20)).toHaveLength(20);
  });
});

describe("extensions", () => {
  it("splits names correctly", () => {
    expect(stripExtension("clip.final.mp4")).toBe("clip.final");
    expect(stripExtension("noext")).toBe("noext");
    expect(fileExtension("Movie.MOV")).toBe("mov");
    expect(fileExtension("noext")).toBe("");
  });
});
