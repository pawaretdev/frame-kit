"use client";

import { ChevronLeft, ChevronRight, Download, Maximize2, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatBytes, formatDuration } from "@/lib/format";
import { useToolStore, type FrameItem } from "@/store/tool-store";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.25;

interface View {
  scale: number;
  x: number;
  y: number;
}

/**
 * Full-screen viewer for extracted frames: fit-to-screen by default, zoom with
 * wheel / pinch / buttons, drag to pan, arrow keys to move between frames.
 */
export function FrameViewer() {
  const frames = useToolStore((s) => s.frames);
  const viewerIndex = useToolStore((s) => s.viewerIndex);
  const viewerUrl = useToolStore((s) => s.viewerUrl);
  const closeViewer = useToolStore((s) => s.closeViewer);
  const frame = viewerIndex === null ? null : (frames[viewerIndex] ?? null);

  return (
    <Dialog open={frame !== null} onOpenChange={(open) => !open && closeViewer()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 text-white ring-0 sm:max-w-none data-open:zoom-in-100 data-closed:zoom-out-100"
        data-testid="frame-viewer"
      >
        {frame && viewerUrl && <ViewerBody frame={frame} url={viewerUrl} index={viewerIndex ?? 0} total={frames.length} />}
      </DialogContent>
    </Dialog>
  );
}

function ViewerBody({ frame, url, index, total }: { frame: FrameItem; url: string; index: number; total: number }) {
  const stepViewer = useToolStore((s) => s.stepViewer);
  const closeViewer = useToolStore((s) => s.closeViewer);
  const downloadOne = useToolStore((s) => s.downloadOne);
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const computeFit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return 1;
    const pad = 16;
    return Math.min((stage.clientWidth - pad) / frame.width, (stage.clientHeight - pad) / frame.height, 1);
  }, [frame.width, frame.height]);

  // Reset to fit-to-screen whenever the frame changes or the window resizes.
  useEffect(() => {
    const apply = () => {
      const fit = computeFit();
      setFitScale(fit);
      setView({ scale: fit, x: 0, y: 0 });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [computeFit]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(Math.min(MIN_SCALE, fitScale), s));

  /** Zoom keeping the point (cx, cy) — relative to stage centre — fixed on screen. */
  const zoomAt = useCallback(
    (factor: number, cx = 0, cy = 0) => {
      setView((v) => {
        const scale = clampScale(v.scale * factor);
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clampScale only depends on fitScale
    [fitScale],
  );

  const resetView = useCallback(() => setView({ scale: fitScale, x: 0, y: 0 }), [fitScale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") stepViewer(1);
      else if (e.key === "ArrowLeft") stepViewer(-1);
      else if (e.key === "+" || e.key === "=") zoomAt(ZOOM_STEP);
      else if (e.key === "-") zoomAt(1 / ZOOM_STEP);
      else if (e.key === "0") resetView();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepViewer, zoomAt, resetView]);

  const stageCentre = (e: { clientX: number; clientY: number }) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { cx: e.clientX - rect.left - rect.width / 2, cy: e.clientY - rect.top - rect.height / 2 };
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { cx, cy } = stageCentre(e);
    zoomAt(Math.exp(-e.deltaY * 0.002), cx, cy);
  };

  const isControl = (target: EventTarget | null) => target instanceof Element && target.closest("button") !== null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isControl(e.target)) return; // let prev/next buttons receive their click
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { x: view.x, y: view.y, startX: e.clientX, startY: e.clientY };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
      drag.current = null;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const { cx, cy } = stageCentre({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      const target = clampScale((pinch.current.scale * distance) / pinch.current.distance);
      setView((v) => {
        const k = target / v.scale;
        return { scale: target, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    } else if (drag.current) {
      const d = drag.current;
      setView((v) => ({ ...v, x: d.x + (e.clientX - d.startX), y: d.y + (e.clientY - d.startY) }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  const onDoubleClick = (e: ReactPointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (isControl(e.target)) return;
    if (view.scale > fitScale * 1.01) resetView();
    else {
      const { cx, cy } = stageCentre(e);
      zoomAt(Math.max(2, 1 / fitScale) / view.scale, cx, cy);
    }
  };

  const percent = Math.round(view.scale * 100);

  return (
    <div className="flex h-full flex-col">
      <DialogTitle className="sr-only">
        {frame.fileName} — frame at {formatDuration(frame.timestamp, { ms: true })}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Full-size preview. Use the mouse wheel or pinch to zoom, drag to pan, and the arrow keys to move between frames.
      </DialogDescription>

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-3 py-2 text-xs">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" data-testid="viewer-title">
            {frame.fileName}
          </p>
          <p className="font-mono tabular-nums text-white/60">
            {formatDuration(frame.timestamp, { ms: true })} · {frame.width}×{frame.height} · {formatBytes(frame.blob.size)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={() => zoomAt(1 / ZOOM_STEP)} aria-label="Zoom out">
            <Minus />
          </Button>
          <button
            type="button"
            className="w-14 rounded-md px-1 py-1 font-mono text-xs tabular-nums hover:bg-white/10"
            onClick={resetView}
            title="Fit to screen (0)"
            data-testid="viewer-zoom"
          >
            {percent}%
          </button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={() => zoomAt(ZOOM_STEP)} aria-label="Zoom in">
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setView({ scale: 1, x: 0, y: 0 })} aria-label="Actual size (100%)" title="Actual size">
            <Maximize2 />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={() => downloadOne(frame.id)} aria-label={`Download ${frame.fileName}`}>
            <Download />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={closeViewer} aria-label="Close viewer" data-testid="viewer-close">
            <X />
          </Button>
        </div>
      </header>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        style={{ cursor: view.scale > fitScale * 1.01 ? "grab" : "zoom-in" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        data-testid="viewer-stage"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not optimisable */}
        <img
          src={url}
          alt={`Frame at ${formatDuration(frame.timestamp, { ms: true })}`}
          draggable={false}
          width={frame.width}
          height={frame.height}
          className="absolute top-1/2 left-1/2 max-w-none"
          style={{
            width: frame.width,
            height: frame.height,
            transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.scale})`,
            transformOrigin: "center",
            imageRendering: view.scale >= 3 ? "pixelated" : "auto",
          }}
          data-testid="viewer-image"
        />
        {total > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20"
              onClick={() => stepViewer(-1)}
              aria-label="Previous frame"
              data-testid="viewer-prev"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20"
              onClick={() => stepViewer(1)}
              aria-label="Next frame"
              data-testid="viewer-next"
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>

      <footer className="flex items-center justify-center gap-4 border-t border-white/10 px-3 py-2 text-xs text-white/60">
        <span data-testid="viewer-counter">
          {index + 1} / {total}
        </span>
        <span className="hidden sm:inline">← → frames · scroll or pinch to zoom · double-click to toggle · Esc to close</span>
      </footer>
    </div>
  );
}
