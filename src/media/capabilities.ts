export interface Capabilities {
  webCodecs: boolean;
  offscreenCanvas: boolean;
  webpEncode: boolean;
  fileSystemAccess: boolean;
  requestVideoFrameCallback: boolean;
}

let cached: Promise<Capabilities> | null = null;

export function hasWebCodecs(): boolean {
  return typeof VideoDecoder !== "undefined" && typeof VideoFrame !== "undefined";
}

export function hasOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== "undefined" && "convertToBlob" in OffscreenCanvas.prototype;
}

export function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function" && window.isSecureContext;
}

async function canEncodeWebp(): Promise<boolean> {
  try {
    if (hasOffscreenCanvas()) {
      const blob = await new OffscreenCanvas(1, 1).convertToBlob({ type: "image/webp" });
      return blob.type === "image/webp";
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/** Detect once per page load; safe to call from anywhere in the browser. */
export function detectCapabilities(): Promise<Capabilities> {
  if (!cached) {
    cached = (async () => ({
      webCodecs: hasWebCodecs(),
      offscreenCanvas: hasOffscreenCanvas(),
      webpEncode: await canEncodeWebp(),
      fileSystemAccess: hasFileSystemAccess(),
      requestVideoFrameCallback:
        typeof HTMLVideoElement !== "undefined" && "requestVideoFrameCallback" in HTMLVideoElement.prototype,
    }))();
  }
  return cached;
}
