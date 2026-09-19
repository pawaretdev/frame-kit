"use client";

import { FileVideo, Upload } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { limits } from "@/config/limits";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTRIBUTE } from "@/media";
import { useToolStore } from "@/store/tool-store";

export function Dropzone({ className }: { className?: string }) {
  const loadFile = useToolStore((s) => s.loadFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a video here or choose a file"
      data-testid="dropzone"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "group flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        "border-border bg-card hover:border-foreground/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "border-foreground bg-accent",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
        {dragging ? <FileVideo className="size-7" /> : <Upload className="size-7" />}
      </div>
      <div className="space-y-1">
        <p className="text-lg font-medium">Drop your video here</p>
        <p className="text-sm text-muted-foreground">
          or <span className="underline underline-offset-4">choose a file</span>
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        MP4, MOV, WebM, MKV · up to {limits.maxFileSizeMb} MB · up to {Math.round(limits.maxDurationSec / 60)} min
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        data-testid="file-input"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
