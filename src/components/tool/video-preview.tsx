"use client";

import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/format";
import { useToolStore } from "@/store/tool-store";

export function VideoPreview() {
  const fileUrl = useToolStore((s) => s.fileUrl);
  const metadata = useToolStore((s) => s.metadata);
  const status = useToolStore((s) => s.status);
  const currentTime = useToolStore((s) => s.currentTime);
  const previewAvailable = useToolStore((s) => s.previewAvailable);
  const setCurrentTime = useToolStore((s) => s.setCurrentTime);
  const setPreviewAvailable = useToolStore((s) => s.setPreviewAvailable);
  const captureCurrent = useToolStore((s) => s.captureCurrent);
  const busy = status === "extracting" || status === "zipping";

  if (!fileUrl || !metadata) return null;

  return (
    <section className="space-y-3" aria-label="Video preview">
      <div className="overflow-hidden rounded-xl border bg-black">
        {previewAvailable ? (
          <video
            key={fileUrl}
            src={fileUrl}
            controls
            playsInline
            muted
            preload="metadata"
            className="mx-auto max-h-[60vh] w-full"
            data-testid="video-preview"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onError={() => setPreviewAvailable(false)}
          />
        ) : (
          <FallbackPreview />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm tabular-nums text-muted-foreground" data-testid="time-display">
          {formatDuration(currentTime, { ms: true })} / {formatDuration(metadata.duration)}
        </p>
        <Button onClick={() => void captureCurrent()} disabled={busy} data-testid="capture-current">
          <Camera data-icon="inline-start" />
          Capture this frame
        </Button>
      </div>
    </section>
  );
}

/**
 * Used when the browser can't play the file in a <video> element but the
 * decoder can still read it (for example MKV in Safari). Renders frames on
 * demand from the FrameSource while scrubbing.
 */
function FallbackPreview() {
  const source = useToolStore((s) => s.source);
  const metadata = useToolStore((s) => s.metadata);
  const currentTime = useToolStore((s) => s.currentTime);
  const setCurrentTime = useToolStore((s) => s.setCurrentTime);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!source || !metadata) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const bitmap = await source.getFrame(currentTime);
        if (cancelled) {
          bitmap.close();
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(bitmap, 0, 0);
        bitmap.close();
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source, metadata, currentTime]);

  if (!metadata) return null;

  return (
    <div className="space-y-3 p-3">
      {failed ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Preview isn&apos;t available for this file, but you can still extract frames below.
        </p>
      ) : (
        <canvas ref={canvasRef} className="mx-auto max-h-[60vh] w-full object-contain" aria-label="Frame preview" />
      )}
      <Slider
        aria-label="Scrub video"
        min={0}
        max={metadata.duration}
        step={0.01}
        value={[currentTime]}
        onValueChange={([v]) => setCurrentTime(v)}
      />
      <p className="text-center text-xs text-muted-foreground">
        Your browser can&apos;t play this format directly, so FrameKit renders the preview from the decoder.
      </p>
    </div>
  );
}
