# FrameKit — Tech Stack & Implementation Plan

> ตัดสินใจล่าสุด: 2026-09-19 · อ้างอิง requirement ใน [REQUIREMENTS.md](../REQUIREMENTS.md)

## 1. การตัดสินใจหลัก: Browser-only MVP

Requirement ข้อ 9 ระบุให้ prefer browser-side processing และ Video → Image ทำได้ครบทุก feature ในเบราว์เซอร์ MVP จึง **ไม่มี backend เลย**

ผลที่ตามมา:

- **Privacy เป็นจริงโดยโครงสร้าง** ไฟล์ไม่เคยออกจากเครื่องผู้ใช้ ไม่ต้องมี cleanup job, rate limit, isolated worker, temp URL
- **Deploy เป็น static site** (`output: 'export'`) ค่าใช้จ่ายศูนย์ วางบน Cloudflare Pages / Vercel / S3 ก็ได้
- **ไม่มี state "Uploading"** เหลือ Reading metadata → Extracting → Done
- **ข้อแลก** AVI และ codec ที่เบราว์เซอร์ decode ไม่ได้ (ProRes, MPEG-2, DNxHD) จะไม่รองรับใน MVP แสดง error ชัดเจนพร้อมคำแนะนำให้แปลงเป็น MP4 ก่อน ส่วน server tier เก็บไว้ทำเมื่อมี demand จริง

### เปรียบเทียบ decode engine

| ทางเลือก | ข้อดี | ข้อเสีย | การใช้ |
|---|---|---|---|
| `<video>` + canvas | ง่าย ทำงานทุกเบราว์เซอร์ hardware decode | seek ทีละเฟรมช้า (~50–200 ms/เฟรม) ไม่รองรับ MKV | Phase 2 และ fallback ถาวร |
| WebCodecs + mediabunny | เร็วกว่า 5–10 เท่า timestamp เป๊ะ รองรับ MP4/MOV/WebM/MKV | ต้อง Safari 16.4+ / Firefox 130+ / Chrome 94+ | Phase 6 เป็น engine หลัก |
| ffmpeg.wasm | รองรับทุก format | โหลด ~30 MB, ไม่มี hardware decode, ต้องใส่ COOP/COEP ซึ่งทำให้ฝัง third-party (ads/analytics) ไม่ได้, กิน memory กับไฟล์ 500 MB | ไม่ใช้ |

หลักการ: UI คุยกับ interface `FrameSource` เดียว แล้ว capability detection เลือก implementation ให้เอง

## 2. Tech stack

| ชั้น | เลือก | เหตุผล |
|---|---|---|
| Framework | Next.js 16 (App Router, static export) + React 19 + TypeScript | ต้องมี SEO landing page ต่อ tool (ข้อ 16–17) ไม่มี backend จึง export static ได้ |
| UI | Tailwind v4 + shadcn/ui (radix-nova) | minimal / responsive / เร็ว |
| State | Zustand | store เดียว: file, metadata, settings, job, frames |
| Worker | Web Worker + Comlink | resize + encode ใน worker ไม่ให้ UI ค้าง |
| Decode v1 | HTMLVideoElement + `requestVideoFrameCallback` | ตัวเดียวกับ preview player |
| Decode v2 | mediabunny (WebCodecs) | `CanvasSink.canvasesAtTimestamps()` ดึงเฟรมตาม timestamp รองรับ MKV |
| Encode / Resize | OffscreenCanvas `convertToBlob` + `createImageBitmap({ resizeWidth })` | native ไม่ต้องโหลด lib WebP บน Safari ต้อง feature-detect |
| ZIP | client-zip (streaming) | ไม่รวมทุกไฟล์ใน memory บน Chrome ต่อกับ `showSaveFilePicker` stream ลง disk |
| Large sets | Blob (browser-managed) + thumbnail 240 px | Blob อยู่นอก JS heap เบราว์เซอร์ spill ลง disk เอง OPFS เป็น optimization ภายหลัง |
| Config / limits | env `NEXT_PUBLIC_*` + zod | ปรับ limit โดยไม่แตะ logic (ข้อ 12) |
| Analytics | Plausible (optional ผ่าน env) | event-only ไม่มี PII (ข้อ 18) |
| Test | Vitest (pure logic) + Playwright (E2E) | headless Chromium ไม่มี H.264 → fixture เป็น WebM/VP9 |
| Hosting | Cloudflare Pages หรือ Vercel | static ล้วน |

## 3. โครงสร้าง code

Repo เดียว ไม่ทำ monorepo แต่ `src/media/` เป็น TypeScript ล้วนไม่ import React เพื่อให้ tool ถัดไป (GIF, WebP, contact sheet) ใช้ซ้ำได้ (ข้อ 15) ถ้าโตค่อยดึงเป็น package

```text
src/
  app/                    # routes: /, /video-to-image
  components/
    ui/                   # shadcn
    tool/                 # dropzone, video-preview, extraction-settings, progress, frame-grid, download-bar
  store/                  # zustand
  config/limits.ts        # zod + env
  lib/                    # analytics, format helpers
  media/                  # ไม่มี React
    types.ts              # FrameSource, VideoMetadata, EncodeOptions, ExtractedFrame
    errors.ts             # MediaError + code → user-facing message
    planner.ts            # interval / count → timestamps[]
    capabilities.ts       # WebCodecs? WebP encode? showSaveFilePicker?
    sources/
      video-element.ts    # VideoElementSource
      webcodecs.ts        # WebCodecsSource (mediabunny)
      index.ts            # createFrameSource(file) เลือกให้อัตโนมัติ
    encoder.worker.ts     # resize + encode (Comlink)
    encoder.ts            # client wrapper
    extract.ts            # orchestrator: source → worker → frames (progress, abort)
    zip.ts                # client-zip + save
    filename.ts           # sanitize + frame-00001.ext
```

## 4. แผนงาน

| Phase | เนื้อหา | ประมาณ |
|---|---|---|
| 0 | Setup: Next + Tailwind + shadcn + Vitest + Playwright + limits config + static export | 0.5 วัน |
| 1 | Upload & Preview: dropzone, validate type/size, metadata ผ่าน video element, error states | 1 วัน |
| 2 | media-core v1: FrameSource + VideoElementSource, planner, encoder worker, Capture current frame | 2 วัน |
| 3 | Extraction UI: settings, progress, cancel (AbortSignal), frame grid, ลบเฟรม, download เดี่ยว | 2 วัน |
| 4 | ZIP & memory: client-zip streaming, `showSaveFilePicker` fallback blob, thumbnail strategy | 1 วัน |
| 5 | Landing `/video-to-image`, SEO metadata, analytics events, error copy, mobile polish | 1–2 วัน |
| 6 | WebCodecs engine ผ่าน mediabunny + capability detection + fallback + MKV | 2 วัน |

หลัง MVP (ทำเมื่อมี demand):

- Server tier: FFmpeg worker (Railway/Fly, tmpfs) + presigned upload ไป R2 lifecycle 1 ชม. สำหรับ AVI/ProRes
- OPFS สำหรับชุดเฟรมใหญ่มาก
- Video → GIF / WebP, Contact sheet ใช้ `FrameSource` ตัวเดิม

## 5. ความเสี่ยงและวิธีรับมือ

- **WebP encode บน Safari** feature-detect ตอนโหลด ถ้าไม่ได้ซ่อนตัวเลือก (หรือใช้ `@jsquash/webp` ภายหลัง)
- **500 เฟรม 4K ≈ 1–2 GB** เก็บเป็น Blob ไม่ใช่ data URL แสดง grid ด้วย thumbnail เท่านั้น เปิดเฟรมเต็มขนาดเมื่อ download
- **timestamp บน video element** seek ลงเฟรมที่ decode ได้ใกล้สุด คลาดไม่กี่ ms ยอมรับได้ Phase 6 แก้ให้เป๊ะ
- **Playwright + H.264** headless Chromium ไม่มี codec proprietary ใช้ fixture WebM/VP9 ที่ generate จาก canvas + MediaRecorder
- **iOS Safari** ต้อง `playsinline` + `muted` และ memory จำกัด ~1–2 GB ต่อ tab จำกัด max frames ต่ำกว่าบน mobile ผ่าน config

## 6. Limits เริ่มต้น (แก้ได้ผ่าน env)

| Env | Default |
|---|---|
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | 500 |
| `NEXT_PUBLIC_MAX_DURATION_SEC` | 1800 |
| `NEXT_PUBLIC_MAX_FRAMES` | 500 |
| `NEXT_PUBLIC_MAX_PROCESSING_SEC` | 600 |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | (ว่าง = ปิด analytics) |

## 7. Analytics events

`page_view`, `upload_started`, `upload_completed`, `extraction_started`, `extraction_completed`, `download_single`, `download_all`, `processing_error` — ส่งเฉพาะ props ที่ไม่ระบุตัวตน (format, mode, frame_count, error_code, duration_bucket)

## 8. สถานะการทำ (อัปเดต 2026-09-19)

| Phase | สถานะ | หมายเหตุ |
|---|---|---|
| 0 Setup | ✅ | Next 16.3 (Turbopack, `output: "export"`), Tailwind v4, shadcn radix-nova, Vitest, Playwright, CI workflow |
| 1 Upload & Preview | ✅ | `Dropzone`, `FileSummary`, `VideoPreview` (+ fallback preview จาก decoder เมื่อ `<video>` เล่นไม่ได้) |
| 2 media-core v1 | ✅ | `FrameSource`, `VideoElementSource`, planner, encoder worker (Comlink), Capture current frame |
| 3 Extraction UI | ✅ | settings, progress + cancel, frame grid, remove, download เดี่ยว |
| 4 ZIP & memory | ✅ | client-zip streaming + `showSaveFilePicker` (Chromium) / Blob fallback; เฟรมเก็บเป็น Blob + thumbnail 320 px; OPFS ยังไม่ทำ |
| 5 Landing / SEO / analytics | ✅ | `/video-to-image` มีเนื้อหา + FAQ + JSON-LD, sitemap/robots, Plausible ผ่าน env |
| 6 WebCodecs engine | ✅ | `WebCodecsSource` (mediabunny `CanvasSink.canvasesAtTimestamps`) เป็น engine หลัก, fallback อัตโนมัติ, E2E ยืนยันทั้งสอง engine |

### บันทึกระหว่างทำ

- **Engine override** ใส่ `?engine=video-element` (หรือ `webcodecs`) ท้าย URL เพื่อบังคับ engine ตอน debug/test
- **Turbopack + Web Worker** `new Worker(new URL("./encoder.worker.ts", import.meta.url), { type: "module" })` ถูก bundle ถูกต้องทั้ง dev และ static export (spawn เป็น `turbopack-worker-*.js`) แต่ Turbopack จะ emit ไฟล์ `.ts` ดิบไว้ใน `_next/static/media/` ด้วย ไฟล์นี้ไม่ถูกโหลด ไม่ต้องสนใจ
- **E2E fixture** สร้าง `e2e/fixtures/sample.webm` (3 วินาที, 320×180) ด้วย canvas + MediaRecorder ใน headless Chromium ตอน globalSetup ไม่ต้องมี ffmpeg; ไฟล์ WebM จาก MediaRecorder ไม่มี duration ใน header จึงมี trick seek-to-end ใน `VideoElementSource`
- **จำนวนเฟรมต่อ session** limit `maxFrames` นับรวมเฟรมที่อยู่ใน grid แล้ว (extract หลายรอบสะสมได้จนถึง limit)
- **ยังไม่ได้ทดสอบจริง** บน Safari/iOS และ Firefox — ทำผ่าน capability detection + fallback ตามสเปกแล้ว แต่ควรลองกับเครื่องจริงก่อน launch
- **Theme** Light / Dark / System ผ่าน next-themes (`attribute="class"` เข้ากับ `.dark` variant ของ shadcn) ปุ่มอยู่ที่ header จำค่าไว้ใน localStorage
- **Frame viewer** กด thumbnail เปิดรูปเต็มขนาดแบบ full screen (shadcn Dialog) ซูมด้วย wheel/pinch/ปุ่ม ลากเลื่อน ลูกศรซ้ายขวาเปลี่ยนเฟรม; object URL ของรูปเต็มเก็บใน store ไม่ใช่ใน React effect เพื่อเลี่ยง StrictMode revoke ซ้ำ
