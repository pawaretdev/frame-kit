import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <nav aria-label="Tools" className="flex items-center gap-4 text-sm">
          {siteConfig.tools.map((tool) => (
            <Link key={tool.slug} href={`/${tool.slug}`} className="text-muted-foreground hover:text-foreground">
              {tool.title}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
