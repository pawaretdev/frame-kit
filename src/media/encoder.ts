import { releaseProxy, transfer, wrap, type Remote } from "comlink";
import { hasOffscreenCanvas } from "./capabilities";
import { encodeBitmap, type EncodeRequest, type EncodeResult } from "./encode-core";
import type { EncoderApi } from "./encoder.worker";
import { FrameKitError } from "./errors";

export interface Encoder {
  readonly kind: "worker" | "main-thread";
  encode(bitmap: ImageBitmap, req: EncodeRequest): Promise<EncodeResult>;
  dispose(): void;
}

let shared: Encoder | null = null;

/** Lazily create a shared encoder: a Web Worker when possible, else main thread. */
export function getEncoder(): Encoder {
  if (shared) return shared;
  shared = tryCreateWorkerEncoder() ?? createMainThreadEncoder();
  return shared;
}

export function disposeEncoder(): void {
  shared?.dispose();
  shared = null;
}

function tryCreateWorkerEncoder(): Encoder | null {
  if (typeof Worker === "undefined" || !hasOffscreenCanvas()) return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL("./encoder.worker.ts", import.meta.url), { type: "module" });
  } catch (e) {
    console.warn("[framekit] Worker unavailable, encoding on main thread:", e);
    return null;
  }
  const remote: Remote<EncoderApi> = wrap<EncoderApi>(worker);
  const failed = new Promise<never>((_, reject) => {
    worker.addEventListener("error", (event) => {
      reject(new FrameKitError("encode_failed", event.message || "Encoder worker crashed"));
    });
  });
  failed.catch(() => {});

  return {
    kind: "worker",
    encode: (bitmap, req) => Promise.race([remote.encode(transfer(bitmap, [bitmap]), req), failed]),
    dispose: () => {
      remote[releaseProxy]();
      worker.terminate();
    },
  };
}

function createMainThreadEncoder(): Encoder {
  return {
    kind: "main-thread",
    encode: (bitmap, req) =>
      encodeBitmap(
        bitmap,
        req,
        (w, h) => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          return c;
        },
        (canvas, type, quality) =>
          new Promise<Blob>((resolve, reject) => {
            (canvas as HTMLCanvasElement).toBlob(
              (b) => (b ? resolve(b) : reject(new FrameKitError("encode_failed", `toBlob returned null for ${type}`))),
              type,
              quality,
            );
          }),
      ),
    dispose: () => {},
  };
}
