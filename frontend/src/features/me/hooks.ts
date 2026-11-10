import { useQuery } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { meKeys } from "./keys";
import type { MyLoan, MyReservationItem, MySummary } from "./types";

export function useMyLoans() {
  return useQuery<MyLoan[], ApiError>({
    queryKey: meKeys.loans(),
    queryFn: () => api<MyLoan[]>("/me/loans"),
  });
}

export function useMyReservations() {
  return useQuery<MyReservationItem[], ApiError>({
    queryKey: meKeys.reservations(),
    queryFn: () => api<MyReservationItem[]>("/me/reservations"),
  });
}

export function useMySummary() {
  return useQuery<MySummary, ApiError>({
    queryKey: meKeys.summary(),
    queryFn: () => api<MySummary>("/me/summary"),
  });
}
