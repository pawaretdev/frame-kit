"use client";

import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { limits } from "@/config/limits";
import { estimateFrameCount, type OutputFormat } from "@/media";
import { useToolStore, type ResolutionPreset } from "@/store/tool-store";
import { TimeInput } from "./time-input";

const RESOLUTIONS: { value: ResolutionPreset; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "1920", label: "1920 px" },
  { value: "1280", label: "1280 px" },
  { value: "720", label: "720 px" },
  { value: "custom", label: "Custom" },
];

export function ExtractionSettings() {
  const settings = useToolStore((s) => s.settings);
  const metadata = useToolStore((s) => s.metadata);
  const status = useToolStore((s) => s.status);
  const frames = useToolStore((s) => s.frames);
  const currentTime = useToolStore((s) => s.currentTime);
  const capabilities = useToolStore((s) => s.capabilities);
  const updateSettings = useToolStore((s) => s.updateSettings);
  const extract = useToolStore((s) => s.extract);

  const duration = metadata?.duration ?? 0;
  const busy = status === "extracting" || status === "zipping";

  const estimate = useMemo(
    () =>
      estimateFrameCount({
        mode: settings.mode,
        start: settings.start,
        end: Math.min(settings.end, duration),
        interval: settings.interval,
        count: settings.count,
        current: currentTime,
      }),
    [settings, duration, currentTime],
  );
  const remaining = Math.max(0, limits.maxFrames - frames.length);
  const willTruncate = estimate > remaining;
  const webpUnavailable = capabilities !== null && !capabilities.webpEncode;

  if (!metadata) return null;

  return (
    <section className="space-y-5 rounded-xl border bg-card p-4" aria-label="Extraction settings">
      <div className="space-y-2">
        <Label>Extract</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={settings.mode}
          onValueChange={(v) => v && updateSettings({ mode: v as "interval" | "count" })}
          disabled={busy}
        >
          <ToggleGroupItem value="interval" className="flex-1" data-testid="mode-interval">
            Every N seconds
          </ToggleGroupItem>
          <ToggleGroupItem value="count" className="flex-1" data-testid="mode-count">
            N frames
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="start">Start</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => updateSettings({ start: Math.min(currentTime, settings.end) })}
              disabled={busy}
            >
              use current
            </button>
          </div>
          <TimeInput id="start" value={settings.start} max={duration} onChange={(start) => updateSettings({ start })} disabled={busy} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="end">End</Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => updateSettings({ end: Math.max(currentTime, settings.start) })}
              disabled={busy}
            >
              use current
            </button>
          </div>
          <TimeInput id="end" value={settings.end} max={duration} onChange={(end) => updateSettings({ end })} disabled={busy} />
        </div>
      </div>

      {settings.mode === "interval" ? (
        <div className="space-y-2">
          <Label htmlFor="interval">Interval (seconds)</Label>
          <Input
            id="interval"
            type="number"
            inputMode="decimal"
            min={0.04}
            step={0.5}
            value={settings.interval}
            disabled={busy}
            data-testid="interval-input"
            onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="count">Number of frames</Label>
          <Input
            id="count"
            type="number"
            inputMode="numeric"
            min={1}
            max={limits.maxFrames}
            step={1}
            value={settings.count}
            disabled={busy}
            data-testid="count-input"
            onChange={(e) => updateSettings({ count: Math.floor(Number(e.target.value)) })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select value={settings.format} onValueChange={(v) => updateSettings({ format: v as OutputFormat })} disabled={busy}>
            <SelectTrigger id="format" className="w-full" data-testid="format-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jpeg">JPG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="webp" disabled={webpUnavailable}>
                WebP{webpUnavailable ? " (not supported here)" : ""}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution</Label>
          <Select value={settings.resolution} onValueChange={(v) => updateSettings({ resolution: v as ResolutionPreset })} disabled={busy}>
            <SelectTrigger id="resolution" className="w-full" data-testid="resolution-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {settings.resolution === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="custom-width">Longest edge (px)</Label>
          <Input
            id="custom-width"
            type="number"
            inputMode="numeric"
            min={16}
            max={Math.max(metadata.width, metadata.height)}
            step={1}
            value={settings.customWidth}
            disabled={busy}
            onChange={(e) => updateSettings({ customWidth: Math.floor(Number(e.target.value)) })}
          />
          <p className="text-xs text-muted-foreground">Aspect ratio is preserved. Frames are never upscaled.</p>
        </div>
      )}

      {settings.format !== "png" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="quality">Quality</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{Math.round(settings.quality * 100)}</span>
          </div>
          <Slider
            id="quality"
            min={10}
            max={100}
            step={1}
            value={[Math.round(settings.quality * 100)]}
            onValueChange={([v]) => updateSettings({ quality: v / 100 })}
            disabled={busy}
          />
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm text-muted-foreground" data-testid="estimate">
          {estimate === 0 ? (
            "Check the time range and settings."
          ) : willTruncate ? (
            <>
              ≈ {estimate.toLocaleString()} frames · limited to <strong>{remaining.toLocaleString()}</strong> (max {limits.maxFrames} per session)
            </>
          ) : (
            <>≈ {estimate.toLocaleString()} frame{estimate === 1 ? "" : "s"}</>
          )}
        </p>
        <Button className="w-full" size="lg" onClick={() => void extract()} disabled={busy || estimate === 0 || remaining === 0} data-testid="extract-button">
          <Sparkles data-icon="inline-start" />
          Extract frames
        </Button>
      </div>
    </section>
  );
}
