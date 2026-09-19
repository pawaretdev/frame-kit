import { ShieldCheck } from "lucide-react";

export function PrivacyNote({ className = "" }: { className?: string }) {
  return (
    <p className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <ShieldCheck className="size-4" aria-hidden />
      Everything runs in your browser. Your video is never uploaded or stored.
    </p>
  );
}
