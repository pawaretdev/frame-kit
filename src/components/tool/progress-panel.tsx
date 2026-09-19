"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToolStore } from "@/store/tool-store";

export function ProgressPanel() {
  const status = useToolStore((s) => s.status);
  const progress = useToolStore((s) => s.progress);
  const cancel = useToolStore((s) => s.cancel);

  if (status === "zipping") {
    return (
      <div className="rounded-xl border bg-card p-4" role="status" aria-live="polite">
        <p className="text-sm font-medium">Building ZIP…</p>
        <Progress className="mt-3" value={null} />
      </div>
    );
  }

  if (status !== "extracting" || !progress) return null;
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4" role="status" aria-live="polite" data-testid="progress-panel">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">Extracting frames…</p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            Frame {progress.current} / {progress.total}
          </p>
        </div>
        <Progress value={pct} aria-label="Extraction progress" />
      </div>
      <Button variant="outline" size="sm" onClick={cancel} data-testid="cancel-button">
        Cancel
      </Button>
    </div>
  );
}
