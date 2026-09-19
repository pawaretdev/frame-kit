"use client";

import { useEffect } from "react";
import { useToolStore } from "@/store/tool-store";
import { DownloadBar } from "./download-bar";
import { Dropzone } from "./dropzone";
import { ErrorState } from "./error-state";
import { ExtractionSettings } from "./extraction-settings";
import { FileSummary } from "./file-summary";
import { FrameGrid } from "./frame-grid";
import { NoticeBanner } from "./notice-banner";
import { ProgressPanel } from "./progress-panel";
import { VideoPreview } from "./video-preview";

/**
 * The Video → Image tool. Composes the UI layer over the media processing
 * layer; all state lives in the tool store.
 */
export function VideoToImageTool() {
  const status = useToolStore((s) => s.status);
  const init = useToolStore((s) => s.init);
  const reset = useToolStore((s) => s.reset);

  useEffect(() => {
    void init();
    return () => reset();
  }, [init, reset]);

  if (status === "idle") return <Dropzone />;
  if (status === "error") return <ErrorState />;

  return (
    <div className="space-y-4" data-testid="tool" data-status={status}>
      <FileSummary />
      {status !== "loading" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <VideoPreview />
          <ExtractionSettings />
        </div>
      )}
      <ProgressPanel />
      <NoticeBanner />
      <FrameGrid />
      <DownloadBar />
    </div>
  );
}
