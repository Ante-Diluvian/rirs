import { Badge } from "@/components/Badge";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { BookCell } from "./BookCell";
import { cell, header, wide } from "./table";
import type { MyLoan } from "./types";

function days(n: number) {
  return `${n} ${plural(n, ["dan", "dneva", "dni", "dni"])}`;
}

// US-06 AC1, AC2: "Zamujena 5 dni" z zamudnino, "Še 2 dneva, rok kmalu poteče"
function LoanState({ loan }: { loan: MyLoan }) {
  if (loan.isOverdue) {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge tone="dark">Zamujena {days(loan.overdueDays)}</Badge>
        <span>{formatMoney(loan.fine)}</span>
      </span>
    );
  }
  const left = loan.daysLeft === 0 ? "Še danes" : `Še ${days(loan.daysLeft)}`;
  return loan.dueSoon ? (
    <Badge tone="muted">{left}, rok kmalu poteče</Badge>
  ) : (
    <Badge>{left}</Badge>
  );
}

export function LoanTable({ loans }: { loans: MyLoan[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-b border-zinc-300 text-left text-sm">
        <thead className="border-b-2 border-zinc-700 bg-zinc-100 text-xs text-zinc-600">
          <tr>
            <th scope="col" className={header}>
              Naslov
            </th>
            <th scope="col" className={`${header} ${wide}`}>
              Izposojeno
            </th>
            <th scope="col" className={`${header} ${wide}`}>
              Rok vrnitve
            </th>
            <th scope="col" className={header}>
              Stanje
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-300">
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td className={cell}>
                <BookCell
                  book={loan.book}
                  details={[
                    ["Izposojeno", formatDate(loan.loanedOn)],
                    ["Rok vrnitve", formatDate(loan.dueDate)],
                  ]}
                />
              </td>
              <td className={`${cell} ${wide}`}>{formatDate(loan.loanedOn)}</td>
              <td className={`${cell} ${wide}`}>{formatDate(loan.dueDate)}</td>
              <td className={cell}>
                <LoanState loan={loan} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
