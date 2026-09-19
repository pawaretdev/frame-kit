import { FORMAT_EXT, type OutputFormat } from "./types";

const UNSAFE = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/** Strip path separators, control and reserved characters (REQUIREMENTS §19). */
export function sanitizeFileName(name: string, maxLength = 80): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(UNSAFE, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : "video";
}

export function stripExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** `frame-00001.jpg` (REQUIREMENTS §8.1) */
export function frameFileName(index: number, format: OutputFormat, prefix = "frame"): string {
  const safeIndex = Math.max(0, Math.floor(index));
  return `${prefix}-${String(safeIndex).padStart(5, "0")}.${FORMAT_EXT[format]}`;
}

export const ZIP_FILE_NAME = "framekit-frames.zip";
