import { describe, expect, it } from "vitest";
import { fitWithin } from "./encode-core";

describe("fitWithin", () => {
  it("keeps original size when no limit is given", () => {
    expect(fitWithin(1920, 1080)).toEqual({ width: 1920, height: 1080 });
    expect(fitWithin(1920, 1080, 0)).toEqual({ width: 1920, height: 1080 });
  });

  it("scales the longest edge and preserves aspect ratio", () => {
    expect(fitWithin(1920, 1080, 1280)).toEqual({ width: 1280, height: 720 });
    expect(fitWithin(1080, 1920, 720)).toEqual({ width: 405, height: 720 });
  });

  it("never upscales", () => {
    expect(fitWithin(640, 360, 1920)).toEqual({ width: 640, height: 360 });
  });
});
