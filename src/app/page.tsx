import Link from "next/link";
import { PrivacyNote } from "@/components/tool/privacy-note";
import { VideoToImageTool } from "@/components/tool/video-to-image-tool";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <section className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Extract frames from your videos.</h1>
        <p className="mt-3 text-lg text-muted-foreground">No account. No permanent storage.</p>
      </section>

      <VideoToImageTool />

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <PrivacyNote />
        <p className="text-sm text-muted-foreground">
          Tool:{" "}
          <Link href="/video-to-image" className="text-foreground underline underline-offset-4">
            Video → Image
          </Link>
        </p>
      </div>

      <section className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3" aria-label="How it works">
        {[
          ["1. Drop a video", "MP4, MOV, WebM or MKV straight from your device. Nothing is uploaded."],
          ["2. Pick your frames", "Capture the current frame, take one every few seconds, or spread N frames across a range."],
          ["3. Download", "Save frames one by one or grab them all as a ZIP. Close the tab and everything is gone."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border bg-card p-5">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
      <p className="mt-10 text-center text-xs text-muted-foreground">{siteConfig.tagline}</p>
    </main>
  );
}
