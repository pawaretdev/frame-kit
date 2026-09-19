"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatDuration, parseTimestamp } from "@/lib/format";

interface TimeInputProps {
  id?: string;
  value: number;
  max: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Text input that accepts `90`, `1:30` or `01:30.250` and normalises on blur. */
export function TimeInput({ id, value, max, onChange, disabled, ...rest }: TimeInputProps) {
  const [text, setText] = useState(() => formatDuration(value, { ms: true }));
  const [invalid, setInvalid] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Re-sync the draft text when the controlled value changes from outside.
  if (value !== lastValue) {
    setLastValue(value);
    setText(formatDuration(value, { ms: true }));
    setInvalid(false);
  }

  const commit = () => {
    const parsed = parseTimestamp(text);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    const clamped = Math.round(Math.min(Math.max(parsed, 0), max) * 1000) / 1000;
    setInvalid(false);
    setText(formatDuration(clamped, { ms: true }));
    onChange(clamped);
  };

  return (
    <Input
      id={id}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className="font-mono tabular-nums"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      {...rest}
    />
  );
}
