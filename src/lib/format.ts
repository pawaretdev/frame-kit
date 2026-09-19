export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** `00:12`, `01:02:03`, or with `ms`: `00:12.250` */
export function formatDuration(seconds: number, options: { ms?: boolean } = {}): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  if (!options.ms) return base;
  const ms = Math.round((seconds - whole) * 1000);
  return `${base}.${pad(ms, 3)}`;
}

/**
 * Accepts `90`, `12.5`, `1:30`, `01:30.250`, `1:02:03`. Returns seconds or null.
 */
export function parseTimestamp(input: string): number | null {
  const text = input.trim();
  if (text === "") return null;
  const parts = text.split(":");
  if (parts.length > 3) return null;
  let total = 0;
  for (const part of parts) {
    if (!/^\d+(\.\d+)?$/.test(part)) return null;
    total = total * 60 + Number(part);
  }
  return Number.isFinite(total) ? total : null;
}
