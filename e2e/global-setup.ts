import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample.webm");
export const FIXTURE_SECONDS = 3;

/**
 * ffmpeg is not guaranteed on dev machines or CI, so the sample video is
 * recorded in headless Chromium with canvas.captureStream + MediaRecorder.
 * WebM/VP9 decodes in Playwright's Chromium (H.264 does not).
 */
export default async function globalSetup(): Promise<void> {
  if (existsSync(FIXTURE_PATH)) return;
  mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const base64 = await page.evaluate(async (seconds) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error("MediaRecorder cannot record WebM");
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 800_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

    let frame = 0;
    const draw = () => {
      const t = frame / 30;
      ctx.fillStyle = `hsl(${(t * 120) % 360} 70% 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText(`${t.toFixed(2)}s`, 20, 100);
      frame++;
    };
    draw();
    recorder.start(250);
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        draw();
        if (frame >= seconds * 30) {
          clearInterval(timer);
          resolve();
        }
      }, 1000 / 30);
    });
    recorder.stop();
    await stopped;

    const blob = new Blob(chunks, { type: "video/webm" });
    const buffer = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }, FIXTURE_SECONDS);
  await browser.close();

  writeFileSync(FIXTURE_PATH, Buffer.from(base64, "base64"));
}
