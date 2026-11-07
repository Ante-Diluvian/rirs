import type { ReactNode } from "react";

const tones = {
  error: "border-red-200 border-l-red-700 bg-red-50 text-red-900",
  success: "border-green-200 border-l-green-700 bg-green-50 text-green-900",
};

export function Alert({
  tone = "error",
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border border-l-4 px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
