"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { limits } from "@/config/limits";
import { errorCopy } from "@/media";
import { useToolStore } from "@/store/tool-store";

/** Non-fatal messages: cancelled, timeout, ZIP failure, invalid settings, truncation. */
export function NoticeBanner() {
  const notice = useToolStore((s) => s.notice);
  const truncatedTo = useToolStore((s) => s.truncatedTo);
  const dismiss = useToolStore((s) => s.dismissNotice);

  if (!notice && truncatedTo === null) return null;

  const copy = notice ? errorCopy(notice) : null;
  const isWarning = notice ? notice.code !== "cancelled" : false;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
      role={isWarning ? "alert" : "status"}
      data-testid="notice"
    >
      {isWarning ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1 space-y-1">
        {copy && (
          <>
            <p className="font-medium">{copy.title}</p>
            <p className="text-muted-foreground">{copy.description}</p>
          </>
        )}
        {truncatedTo !== null && (
          <p className="text-muted-foreground">
            Extraction was limited to {truncatedTo.toLocaleString()} frames (max {limits.maxFrames} per session).
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Dismiss">
        <X />
      </Button>
    </div>
  );
}
