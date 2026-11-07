"use client";

import { Alert } from "@/components/Alert";
import { formatMoney } from "@/lib/format";
import { useMemberSummary } from "./hooks";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function MemberSummaryCard({ memberId }: { memberId: string }) {
  const summary = useMemberSummary(memberId);

  if (summary.isError) return <Alert>{summary.error.message}</Alert>;

  // med nalaganjem okvir že zaseda prostor, da se polja pod njim ne premaknejo
  const data = summary.data;
  return (
    <dl
      aria-label="Povzetek člana"
      aria-busy={summary.isPending}
      className="space-y-0.5 rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2 text-sm"
    >
      <Row
        label="Aktivne izposoje"
        value={data ? `${data.activeLoans} od ${data.maxActiveLoans}` : "…"}
      />
      <Row
        label="Neplačana zamudnina"
        value={data ? formatMoney(data.unpaidFine) : "…"}
      />
      <Row
        label="Račun"
        value={data ? (data.isBlocked ? "blokiran" : "aktiven") : "…"}
      />
    </dl>
  );
}
