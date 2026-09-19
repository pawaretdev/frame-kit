import { expect, test, type Page } from "@playwright/test";
import { FIXTURE_PATH } from "./global-setup";

async function loadFixture(page: Page) {
  await page.getByTestId("file-input").setInputFiles(FIXTURE_PATH);
  await expect(page.getByTestId("file-name")).toHaveText("sample.webm");
  await expect(page.getByTestId("tool")).toHaveAttribute("data-status", "ready", { timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  // Force the Blob download path so ZIP tests are deterministic in headless mode.
  await page.addInitScript(() => {
    Object.defineProperty(window, "showSaveFilePicker", { value: undefined, configurable: true });
  });
});

test("home page explains the product and shows the drop zone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Extract frames from your videos");
  await expect(page.getByText("No account. No permanent storage.")).toBeVisible();
  await expect(page.getByTestId("dropzone")).toBeVisible();
});

test("reads metadata after selecting a video", async ({ page }) => {
  await page.goto("/video-to-image");
  await loadFixture(page);
  const meta = page.getByTestId("file-meta");
  await expect(meta).toContainText("320×180");
  await expect(meta).toContainText(/00:0[2-4]/);
  await expect(page.getByTestId("video-preview")).toBeVisible();
  await expect(page.getByText("Fast engine")).toBeVisible();
});

test("captures the current frame and downloads it", async ({ page }) => {
  await page.goto("/video-to-image");
  await loadFixture(page);
  await page.getByTestId("capture-current").click();
  await expect(page.getByTestId("frame-card")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByTestId("frame-card").first()).toContainText("frame-00001.jpg");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download frame-00001.jpg" }).click();
  expect((await download).suggestedFilename()).toBe("frame-00001.jpg");
});

test("extracts frames by interval, removes one and zips the rest", async ({ page }) => {
  await page.goto("/video-to-image");
  await loadFixture(page);

  await page.getByTestId("mode-interval").click();
  await page.getByTestId("interval-input").fill("1");
  await expect(page.getByTestId("estimate")).toContainText(/≈ [3-5] frames/);

  await page.getByTestId("extract-button").click();
  await expect(page.getByTestId("tool")).toHaveAttribute("data-status", "ready", { timeout: 60_000 });
  const cards = page.getByTestId("frame-card");
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(5);
  await expect(cards.first()).toContainText("00:00.000");

  await cards.first().hover();
  await page.getByRole("button", { name: "Remove frame-00001.jpg" }).click();
  await expect(cards).toHaveCount(count - 1);

  const download = page.waitForEvent("download");
  await page.getByTestId("download-all").click();
  expect((await download).suggestedFilename()).toBe("framekit-frames.zip");
});

test("extracts an exact number of frames with the count mode", async ({ page }) => {
  await page.goto("/video-to-image");
  await loadFixture(page);
  await page.getByTestId("mode-count").click();
  await page.getByTestId("count-input").fill("6");
  await page.getByTestId("extract-button").click();
  await expect(page.getByTestId("frame-card")).toHaveCount(6, { timeout: 60_000 });
});

test("shows a clear error for unsupported files", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByTestId("error-state")).toContainText("We couldn't read this video.");
  await page.getByRole("button", { name: "Choose another video" }).click();
  await expect(page.getByTestId("dropzone")).toBeVisible();
});

test("shows a clear error for a broken video file", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles({ name: "broken.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(4096, 7) });
  await expect(page.getByTestId("error-state")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("error-state")).not.toContainText("Error:");
});

test("the <video> fallback engine extracts frames too", async ({ page }) => {
  await page.goto("/video-to-image?engine=video-element");
  await loadFixture(page);
  await expect(page.getByText("Compatibility engine")).toBeVisible();
  await page.getByTestId("mode-count").click();
  await page.getByTestId("count-input").fill("4");
  await page.getByTestId("format-select").click();
  await page.getByRole("option", { name: "PNG" }).click();
  await page.getByTestId("extract-button").click();
  await expect(page.getByTestId("frame-card")).toHaveCount(4, { timeout: 60_000 });
  await expect(page.getByTestId("frame-card").first()).toContainText("frame-00001.png");
});

test("theme can be switched and is remembered", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByTestId("theme-dark").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("theme-light").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByTestId("theme-system").click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
});
