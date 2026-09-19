import { describe, expect, it, vi } from "vitest";
import { parseLimits } from "./limits";

describe("parseLimits", () => {
  it("uses defaults when nothing is configured", () => {
    expect(parseLimits({})).toEqual({
      maxFileSizeMb: 500,
      maxDurationSec: 1800,
      maxFrames: 500,
      maxProcessingSec: 600,
    });
  });

  it("reads overrides from strings and ignores empty values", () => {
    expect(parseLimits({ maxFrames: "100", maxFileSizeMb: "" }).maxFrames).toBe(100);
    expect(parseLimits({ maxFrames: "100", maxFileSizeMb: "" }).maxFileSizeMb).toBe(500);
  });

  it("falls back to defaults on invalid input", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseLimits({ maxFrames: "lots" }).maxFrames).toBe(500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
