import { describe, expect, it } from "vitest";
import { ERROR_COPY, FrameKitError, errorCopy, toFrameKitError } from "./errors";

describe("toFrameKitError", () => {
  it("passes FrameKitError through", () => {
    const e = new FrameKitError("file_too_large");
    expect(toFrameKitError(e)).toBe(e);
  });

  it("maps AbortError to cancelled", () => {
    expect(toFrameKitError(new DOMException("aborted", "AbortError")).code).toBe("cancelled");
  });

  it("maps memory RangeErrors", () => {
    expect(toFrameKitError(new RangeError("Array buffer allocation failed")).code).toBe("out_of_memory");
  });

  it("uses the fallback for unknown errors", () => {
    expect(toFrameKitError(new Error("boom"), "corrupted_video").code).toBe("corrupted_video");
    expect(toFrameKitError("string").code).toBe("unknown");
  });
});

describe("error copy", () => {
  it("has user-facing text for every code", () => {
    for (const copy of Object.values(ERROR_COPY)) {
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.description.length).toBeGreaterThan(0);
      expect(copy.action.length).toBeGreaterThan(0);
    }
    expect(errorCopy(new Error("x")).title).toBe(ERROR_COPY.unknown.title);
  });
});
