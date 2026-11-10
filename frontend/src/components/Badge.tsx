import type { ReactNode } from "react";

const tones = {
  outline: "border-zinc-700 bg-white text-zinc-900",
  muted: "border-zinc-600 bg-zinc-200 text-zinc-900",
  dark: "border-zinc-800 bg-zinc-800 text-white",
};

export function Badge({
  tone = "outline",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
