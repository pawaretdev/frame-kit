import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {siteConfig.name} — {siteConfig.tagline}
        </p>
        <p>No account. No upload. Nothing is stored.</p>
      </div>
    </footer>
  );
}
