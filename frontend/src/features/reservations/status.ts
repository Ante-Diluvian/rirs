import type { ReservationStatus } from "./types";

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  WAITING: "Čakajoča",
  READY: "Na voljo",
  FULFILLED: "Izposojena",
  EXPIRED: "Potekla",
  CANCELLED: "Preklicana",
};
