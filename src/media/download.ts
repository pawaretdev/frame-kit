import { downloadZip } from "client-zip";
import { hasFileSystemAccess } from "./capabilities";
import { FrameKitError, toFrameKitError } from "./errors";
import { ZIP_FILE_NAME } from "./filename";
import type { ExtractedFrame } from "./types";

/** Trigger a browser download for a Blob and release the object URL afterwards. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadFrame(frame: ExtractedFrame): void {
  saveBlob(frame.blob, frame.fileName);
}

/**
 * Stream all frames into a ZIP. On Chromium the File System Access API writes
 * straight to disk without buffering; elsewhere we fall back to a Blob download.
 * Resolves `false` when the user dismissed the save dialog.
 */
export async function downloadFramesAsZip(frames: readonly ExtractedFrame[], fileName = ZIP_FILE_NAME): Promise<boolean> {
  if (frames.length === 0) return false;
  const now = new Date();
  const response = downloadZip(frames.map((f) => ({ name: f.fileName, lastModified: now, input: f.blob })));

  if (hasFileSystemAccess()) {
    let handle: FileSystemFileHandle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
      });
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return false;
      throw toFrameKitError(e, "zip_failed");
    }
    try {
      const writable = await handle.createWritable();
      if (!response.body) throw new FrameKitError("zip_failed", "Empty ZIP stream");
      await response.body.pipeTo(writable);
      return true;
    } catch (e) {
      throw toFrameKitError(e, "zip_failed");
    }
  }

  try {
    const blob = await response.blob();
    saveBlob(blob, fileName);
    return true;
  } catch (e) {
    throw toFrameKitError(e, "zip_failed");
  }
}
