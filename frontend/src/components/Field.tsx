import type { ReactNode } from "react";

// obroba polja, ob napaki poudarjena kot na W-01
export function fieldClasses(error?: string) {
  return error
    ? "border-2 border-red-700 focus-within:ring-red-200"
    : "border-zinc-400 focus-within:border-zinc-700 focus-within:ring-zinc-200";
}

export function FieldError({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-700">
      <span aria-hidden="true">⚠ </span>
      {children}
    </p>
  );
}
