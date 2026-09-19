"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render a neutral control until hydrated.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const value = mounted ? (theme ?? "system") : "";

  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      aria-label="Theme"
      value={value}
      onValueChange={(v) => v && setTheme(v)}
      data-testid="theme-toggle"
    >
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <ToggleGroupItem key={v} value={v} aria-label={label} title={label} data-testid={`theme-${v}`}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
