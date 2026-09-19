import { z } from "zod";

/**
 * Configurable limits (REQUIREMENTS §12). Values come from NEXT_PUBLIC_* env vars
 * and are inlined at build time; change them without touching application logic.
 */
export const limitsSchema = z.object({
  maxFileSizeMb: z.coerce.number().positive().default(500),
  maxDurationSec: z.coerce.number().positive().default(1800),
  maxFrames: z.coerce.number().int().positive().default(500),
  maxProcessingSec: z.coerce.number().positive().default(600),
});

export type Limits = z.infer<typeof limitsSchema>;

type RawLimits = Partial<Record<keyof Limits, string | undefined>>;

export function parseLimits(raw: RawLimits): Limits {
  const provided = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined && v !== ""),
  );
  const result = limitsSchema.safeParse(provided);
  if (result.success) return result.data;
  console.error("[framekit] Invalid limits configuration, using defaults:", result.error.issues);
  return limitsSchema.parse({});
}

// Each env var must be referenced literally so Next.js can inline it.
export const limits: Limits = parseLimits({
  maxFileSizeMb: process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB,
  maxDurationSec: process.env.NEXT_PUBLIC_MAX_DURATION_SEC,
  maxFrames: process.env.NEXT_PUBLIC_MAX_FRAMES,
  maxProcessingSec: process.env.NEXT_PUBLIC_MAX_PROCESSING_SEC,
});

export const maxFileSizeBytes = limits.maxFileSizeMb * 1024 * 1024;
