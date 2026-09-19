"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration } from "@/lib/format";
import { useToolStore, type FrameItem } from "@/store/tool-store";

export function FrameGrid() {
  const frames = useToolStore((s) => s.frames);
  if (frames.length === 0) return null;

  return (
    <section aria-label="Extracted frames" className="space-y-3">
      <h2 className="text-base font-medium">
        Extracted frames <span className="text-muted-foreground">({frames.length})</span>
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" data-testid="frame-grid">
        {frames.map((frame) => (
          <FrameCard key={frame.id} frame={frame} />
        ))}
      </ul>
    </section>
  );
}

function FrameCard({ frame }: { frame: FrameItem }) {
  const downloadOne = useToolStore((s) => s.downloadOne);
  const removeFrame = useToolStore((s) => s.removeFrame);
  const openViewer = useToolStore((s) => s.openViewer);
  const label = `Frame at ${formatDuration(frame.timestamp, { ms: true })}`;

  return (
    <li className="group overflow-hidden rounded-xl border bg-card" data-testid="frame-card">
      <div className="relative aspect-video bg-muted">
        <button
          type="button"
          className="block size-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => openViewer(frame.id)}
          aria-label={`View ${frame.fileName} full size`}
          data-testid="frame-open"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not optimisable */}
          <img src={frame.thumbnailUrl} alt={label} loading="lazy" decoding="async" className="size-full object-contain" />
        </button>
        <Button
          variant="secondary"
          size="icon-xs"
          className="absolute right-1.5 top-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          onClick={() => removeFrame(frame.id)}
          aria-label={`Remove ${frame.fileName}`}
        >
          <X />
        </Button>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs tabular-nums">{formatDuration(frame.timestamp, { ms: true })}</p>
          <p className="truncate text-[11px] text-muted-foreground" title={frame.fileName}>
            {frame.fileName} · {formatBytes(frame.blob.size)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => downloadOne(frame.id)} aria-label={`Download ${frame.fileName}`}>
          <Download />
        </Button>
      </div>
    </li>
  );
}
