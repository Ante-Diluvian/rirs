import type { ReactNode } from "react";
import { formatDate, formatMoney, plural } from "@/lib/format";
import type { ReturnPreview } from "./types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-baseline gap-4">
      <dt className="text-zinc-600">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// knjiga, član, rok, zamuda in zamudnina kot na W-05
export function ReturnSummary({ loan }: { loan: ReturnPreview }) {
  return (
    <dl
      aria-label="Podatki o izposoji"
      className="space-y-2 rounded-md border border-zinc-400 bg-zinc-100 px-4 py-3 text-sm"
    >
      <Row label="Knjiga">{loan.title}</Row>
      <Row label="Član">
        {loan.member.firstName} {loan.member.lastName}
      </Row>
      <Row label="Rok vrnitve">{formatDate(loan.dueDate)}</Row>
      <Row label="Zamuda">
        {loan.overdueDays}{" "}
        {plural(loan.overdueDays, ["dan", "dneva", "dnevi", "dni"])}
      </Row>
      <Row label="Zamudnina">
        <span className="text-lg font-medium">{formatMoney(loan.fine)}</span>
        {loan.overdueDays > 0 && (
          <span className="ml-1 text-xs text-zinc-600">
            ({loan.overdueDays} × {formatMoney(loan.finePerDay)})
          </span>
        )}
      </Row>
    </dl>
  );
}
