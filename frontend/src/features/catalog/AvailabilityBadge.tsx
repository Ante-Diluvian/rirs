import type { Availability } from "./types";

// US-02 AC3: »1 od 3 prostih«, temna značka, ko ni prostega izvoda
export function AvailabilityBadge({
  availableCopies,
  totalCopies,
}: Pick<Availability, "availableCopies" | "totalCopies">) {
  const style =
    availableCopies > 0
      ? "border-zinc-700 bg-white text-zinc-900"
      : "border-zinc-800 bg-zinc-800 text-white";
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs ${style}`}
    >
      {availableCopies} od {totalCopies} prostih
    </span>
  );
}
