export type ReservationStatus =
  "WAITING" | "READY" | "FULFILLED" | "EXPIRED" | "CANCELLED";

// aktivna rezervacija: položaj ima samo čakajoča, rok prevzema samo Na voljo
export interface MyReservation {
  id: string;
  status: "WAITING" | "READY";
  position: number | null;
  readyUntil: string | null;
}

export interface Reservation extends MyReservation {
  bookId: string;
  createdAt: string;
}
