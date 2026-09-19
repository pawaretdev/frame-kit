/**
 * Product events only (REQUIREMENTS §18). Never send file names or media content.
 * Backed by Plausible when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set; no-op otherwise.
 */
export type AnalyticsEvent =
  | "upload_started"
  | "upload_completed"
  | "extraction_started"
  | "extraction_completed"
  | "download_single"
  | "download_all"
  | "processing_error";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // analytics must never break the tool
  }
}

/** Bucket a duration so we never send exact values that could fingerprint a file. */
export function durationBucket(seconds: number): string {
  if (seconds < 30) return "<30s";
  if (seconds < 120) return "30s-2m";
  if (seconds < 600) return "2m-10m";
  return ">10m";
}
