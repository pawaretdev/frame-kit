import type { Metadata } from "next";
import { PrivacyNote } from "@/components/tool/privacy-note";
import { VideoToImageTool } from "@/components/tool/video-to-image-tool";
import { siteConfig } from "@/config/site";

const title = "Video to Image Converter — Extract frames as JPG, PNG or WebP";
const description =
  "Turn any video into still images in your browser. Capture a single frame, extract one every N seconds, or spread N frames across a range. Free, no account, no upload.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/video-to-image" },
  openGraph: { title, description, url: "/video-to-image" },
};

const faq = [
  {
    q: "Is my video uploaded anywhere?",
    a: "No. FrameKit decodes the video with your browser's built-in media engine. The file never leaves your device, and nothing is kept once you close the tab.",
  },
  {
    q: "Which video formats work?",
    a: "MP4, MOV, WebM and MKV containers with common codecs such as H.264, H.265/HEVC, VP8, VP9 and AV1, depending on what your browser can decode. AVI and professional codecs like ProRes need to be converted to MP4 first.",
  },
  {
    q: "How accurate is the frame timing?",
    a: "In modern browsers FrameKit uses WebCodecs and returns the exact frame at each requested timestamp. Older browsers fall back to seeking the video element, which lands on the nearest decodable frame.",
  },
  {
    q: "Is there a limit?",
    a: "Yes, to keep your browser responsive: file size, video length and the number of frames per session are capped. The limits are shown under the drop zone.",
  },
  {
    q: "Can I choose the output size and format?",
    a: "Yes. Pick JPG, PNG or WebP, set the quality for lossy formats, and downscale to 1920, 1280, 720 px or a custom size. Aspect ratio is always preserved.",
  },
];

export default function VideoToImagePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `${siteConfig.name} — Video to Image`,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any (web browser)",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description,
        url: `${siteConfig.url}/video-to-image`,
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Video to Image</h1>
        <p className="mt-3 text-lg text-muted-foreground">Extract frames from a video as JPG, PNG or WebP — right in your browser.</p>
      </section>

      <VideoToImageTool />

      <div className="mt-6 text-center">
        <PrivacyNote />
      </div>

      <article className="prose-sm mx-auto mt-16 max-w-3xl space-y-10 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">What this tool does</h2>
          <p className="text-muted-foreground">
            A video is just a sequence of still images. This tool lets you pull any of those images back out: a single
            frame at a precise moment, one frame every few seconds for a storyboard, or a fixed number of frames spread
            evenly across a scene. The result is a set of ordinary image files you can use in documents, thumbnails,
            social posts, machine-learning datasets or reference boards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">How to extract frames from a video</h2>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Drop a video file onto the box above, or click it to choose one from your device.</li>
            <li>Use the player to find the moment you want. Press <em>Capture this frame</em> to save exactly that frame.</li>
            <li>For many frames, choose <em>Every N seconds</em> or <em>N frames</em>, set the start and end time, and press <em>Extract frames</em>.</li>
            <li>Review the grid, remove any frames you don&apos;t need, then download them individually or as one ZIP.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Choosing a format</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">JPG</strong> — smallest files, ideal for photos and thumbnails. Use quality 80–90 for a good balance.</li>
            <li><strong className="text-foreground">PNG</strong> — lossless, best for screenshots, UI recordings and anything with text or sharp edges.</li>
            <li><strong className="text-foreground">WebP</strong> — modern format with smaller files than JPG at the same quality; supported by all current browsers.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
          <dl className="space-y-4">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </main>
  );
}
