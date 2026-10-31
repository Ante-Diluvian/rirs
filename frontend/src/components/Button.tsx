import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "border-transparent bg-zinc-800 text-white hover:bg-zinc-700",
  secondary: "border-zinc-800 bg-white text-zinc-900 hover:bg-zinc-100",
};

const sizes = {
  md: "px-4 py-2",
  sm: "px-3 py-1 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-md border focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
