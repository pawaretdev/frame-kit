# FrameKit

Extract frames from your videos. No account, no upload, no permanent storage — everything runs in the browser.

- Product requirements: [REQUIREMENTS.md](REQUIREMENTS.md)
- Tech stack and implementation plan: [docs/PLAN.md](docs/PLAN.md)

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Copy `.env.example` to `.env.local` to change limits or enable analytics.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Static export to `out/` (deploy anywhere that serves static files) |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest) for the media layer and helpers |
| `pnpm e2e` | Playwright end-to-end tests in Chromium (`pnpm exec playwright install chromium` first) |

The E2E suite records its own WebM fixture with `MediaRecorder` in headless Chromium, so `ffmpeg` is not required.

## Architecture

```text
src/media/       Media processing layer — plain TypeScript, no React
  sources/       FrameSource implementations: WebCodecs (mediabunny) and <video> fallback
  planner.ts     interval / count → timestamps
  extract.ts     decode → resize/encode (Web Worker) → ExtractedFrame
  download.ts    single file + streaming ZIP
src/store/       Zustand store wiring the media layer to the UI
src/components/  UI (shadcn/ui + Tailwind)
src/app/         Routes: / and /video-to-image
src/config/      Limits (env-driven) and site metadata
```

Append `?engine=video-element` to the URL to force the fallback decoder when debugging.
