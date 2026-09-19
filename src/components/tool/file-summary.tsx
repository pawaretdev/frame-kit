"use client";

import { FileVideo, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration } from "@/lib/format";
import { useToolStore } from "@/store/tool-store";

export function FileSummary() {
  const file = useToolStore((s) => s.file);
  const metadata = useToolStore((s) => s.metadata);
  const source = useToolStore((s) => s.source);
  const status = useToolStore((s) => s.status);
  const reset = useToolStore((s) => s.reset);
  if (!file) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3">
      <FileVideo className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={file.name} data-testid="file-name">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground" data-testid="file-meta">
          {formatBytes(file.size)}
          {metadata && (
            <>
              {" · "}
              {formatDuration(metadata.duration)}
              {" · "}
              {metadata.width}×{metadata.height}
            </>
          )}
          {status === "loading" && " · Reading video…"}
        </p>
      </div>
      {source && (
        <Badge variant="secondary" className="hidden sm:inline-flex" title="Decoder used in this browser">
          {source.kind === "webcodecs" ? "Fast engine" : "Compatibility engine"}
        </Badge>
      )}
      <Button variant="outline" size="sm" onClick={reset} disabled={status === "extracting" || status === "zipping"}>
        <RotateCcw data-icon="inline-start" />
        Choose another video
      </Button>
    </div>
  );
}
