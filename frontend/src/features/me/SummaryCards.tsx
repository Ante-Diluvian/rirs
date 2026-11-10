import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";
import type { MySummary } from "./types";

function Card({
  label,
  warning = false,
  children,
}: {
  label: string;
  warning?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 ${warning ? "border-red-700 bg-red-50" : "border-zinc-400 bg-white"}`}
    >
      <dt className="text-xs text-zinc-600">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function Count({ value, max }: { value: number; max: number }) {
  return (
    <>
      <span className="text-2xl">{value}</span>{" "}
      <span className="text-sm text-zinc-600">od {max}</span>
    </>
  );
}

// US-06 AC4: med nalaganjem kartice že zasedajo prostor
export function SummaryCards({ summary }: { summary?: MySummary }) {
  const loading = <span className="text-2xl">…</span>;
  return (
    <dl
      aria-label="Povzetek"
      aria-busy={!summary}
      className="grid gap-4 sm:grid-cols-3"
    >
      <Card label="Izposojeno">
        {summary ? (
          <Count value={summary.activeLoans} max={summary.maxActiveLoans} />
        ) : (
          loading
        )}
      </Card>
      <Card label="Aktivne rezervacije">
        {summary ? (
          <Count
            value={summary.activeReservations}
            max={summary.maxActiveReservations}
          />
        ) : (
          loading
        )}
      </Card>
      <Card label="Neplačana zamudnina" warning={summary?.borrowingBlocked}>
        {summary ? (
          <>
            <span className="text-2xl">{formatMoney(summary.unpaidFine)}</span>{" "}
            <span className="text-sm text-zinc-600">
              meja za izposojo je {formatMoney(summary.fineLimit)}
            </span>
            {summary.borrowingBlocked && (
              <p className="mt-2 text-sm text-red-800">
                Izposoja ni mogoča, dokler ne poravnaš zamudnine.
              </p>
            )}
          </>
        ) : (
          loading
        )}
      </Card>
    </dl>
  );
}
