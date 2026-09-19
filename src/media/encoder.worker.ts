/// <reference lib="webworker" />
import { expose } from "comlink";
import { encodeBitmap, type EncodeRequest, type EncodeResult } from "./encode-core";

const api = {
  encode(bitmap: ImageBitmap, req: EncodeRequest): Promise<EncodeResult> {
    return encodeBitmap(
      bitmap,
      req,
      (w, h) => new OffscreenCanvas(w, h),
      (canvas, type, quality) => (canvas as OffscreenCanvas).convertToBlob({ type, quality }),
    );
  },
};

export type EncoderApi = typeof api;

expose(api);
