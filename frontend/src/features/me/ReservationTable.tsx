"use client";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useCancelReservation } from "@/features/reservations/hooks";
import { reservationStatusLabels } from "@/features/reservations/status";
import { formatDate } from "@/lib/format";
import { BookCell } from "./BookCell";
import { cell, header, wide } from "./table";
import type { MyReservationItem } from "./types";

// US-06 AC3: Čakajoča s položajem, Na voljo z rokom prevzema; US-05 AC5: preklic
function ReservationRow({
  reservation,
  onCancelled,
}: {
  reservation: MyReservationItem;
  onCancelled: () => void;
}) {
  const cancel = useCancelReservation();
  return (
    <tr>
      <td className={cell}>
        <BookCell
          book={reservation.book}
          details={[["Rezervirano", formatDate(reservation.reservedOn)]]}
        />
      </td>
      <td className={`${cell} ${wide}`}>
        {formatDate(reservation.reservedOn)}
      </td>
      <td className={cell}>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Badge tone={reservation.status === "READY" ? "dark" : "outline"}>
            {reservationStatusLabels[reservation.status]}
          </Badge>
          {reservation.position !== null && (
            <span>{reservation.position}. v vrsti</span>
          )}
          {reservation.readyUntil && (
            <span>prevzemi do {formatDate(reservation.readyUntil)}</span>
          )}
        </span>
        {cancel.error && (
          <p role="alert" className="mt-1 text-red-700">
            {cancel.error.message}
          </p>
        )}
      </td>
      <td className={`${cell} text-right`}>
        <Button
          variant="secondary"
          size="sm"
          disabled={cancel.isPending}
          // mutateAsync se razreši tudi, ko vrstica po osvežitvi izgine;
          // napako prikaže cancel.error
          onClick={() =>
            cancel.mutateAsync(reservation.id).then(onCancelled, () => {})
          }
        >
          Prekliči
          <span className="sr-only">
            {" "}
            rezervacijo za {reservation.book.title}
          </span>
        </Button>
      </td>
    </tr>
  );
}

export function ReservationTable({
  reservations,
  onCancelled,
}: {
  reservations: MyReservationItem[];
  onCancelled: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-b border-zinc-300 text-left text-sm">
        <thead className="border-b-2 border-zinc-700 bg-zinc-100 text-xs text-zinc-600">
          <tr>
            <th scope="col" className={header}>
              Naslov
            </th>
            <th scope="col" className={`${header} ${wide}`}>
              Rezervirano
            </th>
            <th scope="col" className={header}>
              Stanje
            </th>
            <th scope="col" className={header}>
              <span className="sr-only">Preklic</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-300">
          {reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              onCancelled={onCancelled}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
