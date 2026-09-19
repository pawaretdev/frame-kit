"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorCopy } from "@/media";
import { useToolStore } from "@/store/tool-store";

/** Fatal, file-level error. Explains what happened and what to do next (§11). */
export function ErrorState() {
  const error = useToolStore((s) => s.error);
  const file = useToolStore((s) => s.file);
  const reset = useToolStore((s) => s.reset);
  if (!error) return null;
  const copy = errorCopy(error);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-card px-6 py-10 text-center" role="alert" data-testid="error-state">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-medium">{copy.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{copy.description}</p>
        {file && (
          <p className="truncate pt-1 text-xs text-muted-foreground" title={file.name}>
            {file.name}
          </p>
        )}
      </div>
      <Button onClick={reset}>{copy.action}</Button>
    </div>
  );
}
