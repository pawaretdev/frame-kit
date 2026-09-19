export const siteConfig = {
  name: "FrameKit",
  tagline: "Simple tools for your media.",
  description: "Extract frames from your videos as JPG, PNG or WebP. No account, no upload, no permanent storage — everything runs in your browser.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tools: [{ slug: "video-to-image", title: "Video → Image", short: "Extract frames from a video" }],
} as const;
