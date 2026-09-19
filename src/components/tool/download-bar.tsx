"use client";

import { FolderArchive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToolStore } from "@/store/tool-store";

export function DownloadBar() {
  const frames = useToolStore((s) => s.frames);
  const status = useToolStore((s) => s.status);
  const downloadAll = useToolStore((s) => s.downloadAll);
  const clearFrames = useToolStore((s) => s.clearFrames);
  if (frames.length === 0) return null;
  const busy = status === "extracting" || status === "zipping";

  return (
    <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur" data-testid="download-bar">
      <p className="text-sm">
        <strong>{frames.length.toLocaleString()}</strong> frame{frames.length === 1 ? "" : "s"} ready
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clearFrames} disabled={busy}>
          <Trash2 data-icon="inline-start" />
          Clear
        </Button>
        <Button size="sm" onClick={() => void downloadAll()} disabled={busy} data-testid="download-all">
          <FolderArchive data-icon="inline-start" />
          Download all (ZIP)
        </Button>
      </div>
    </div>
  );
}
