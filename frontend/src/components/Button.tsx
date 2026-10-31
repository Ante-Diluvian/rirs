import type { ButtonHTMLAttributes } from "react";

export function Button({
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`rounded-md bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
