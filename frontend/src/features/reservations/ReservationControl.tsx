"use client";

import { Button } from "@/components/Button";
import { formatDate, plural } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { useCancelReservation, useCreateReservation } from "./hooks";
import { reservationStatusLabels } from "./status";
import type { MyReservation } from "./types";

interface ReservationControlProps {
  book: {
    id: string;
    title: string;
    availableCopies: number;
    myReservation: MyReservation | null;
  };
  // na strani knjige gumb čez celo širino in rok za prevzem (W-03)
  pickupDays?: number;
  className?: string;
}

// US-05 AC2: "2. v vrsti" ali rok prevzema rezervacije Na voljo
function ReservationState({ reservation }: { reservation: MyReservation }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      <span className="rounded border border-zinc-700 bg-white px-1.5 py-0.5 text-xs">
        {reservationStatusLabels[reservation.status]}
      </span>
      {reservation.position !== null && (
        <span>{reservation.position}. v vrsti</span>
      )}
      {reservation.readyUntil && (
        <span>prevzem do {formatDate(reservation.readyUntil)}</span>
      )}
    </p>
  );
}

// gumb Rezerviraj, "Na voljo na polici" ali stanje rezervacije s preklicem;
// rezervira lahko samo bralec, pravila preveri backend
export function ReservationControl({
  book,
  pickupDays,
  className = "",
}: ReservationControlProps) {
  const role = useAuthStore((state) => state.user?.role);
  const create = useCreateReservation();
  const cancel = useCancelReservation();
  if (role !== "READER") return null;

  const reservation = book.myReservation;
  const error = create.error ?? cancel.error;
  const panel = pickupDays !== undefined;

  let content;
  if (reservation) {
    content = (
      <>
        <ReservationState reservation={reservation} />
        {/* US-05 AC5 */}
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={() => {
            create.reset();
            cancel.mutate(reservation.id);
          }}
          className={`text-sm underline hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-60 ${panel ? "self-start" : ""}`}
        >
          Prekliči rezervacijo
          {!panel && <span className="sr-only"> za {book.title}</span>}
        </button>
      </>
    );
  } else if (book.availableCopies > 0) {
    // US-05 AC1
    content = <p className="text-sm text-zinc-600">Na voljo na polici</p>;
  } else {
    content = (
      <>
        <Button
          size={panel ? "md" : "sm"}
          disabled={create.isPending}
          onClick={() => {
            cancel.reset();
            create.mutate(book.id);
          }}
          className={panel ? "w-full" : undefined}
        >
          Rezerviraj
          {!panel && <span className="sr-only"> {book.title}</span>}
        </Button>
        {panel && (
          <p className="text-xs text-zinc-600">
            Ko prideš na vrsto, imaš {pickupDays}{" "}
            {plural(pickupDays, ["dan", "dneva", "dni", "dni"])} za prevzem.
          </p>
        )}
      </>
    );
  }

  return (
    <div
      aria-live="polite"
      className={`flex flex-col gap-1.5 ${panel ? "items-stretch" : "items-end text-right"} ${className}`}
    >
      {content}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error.message}
        </p>
      )}
    </div>
  );
}
