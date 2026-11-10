import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookKeys } from "@/features/catalog/keys";
import { meKeys } from "@/features/me/keys";
import { api, type ApiError } from "@/lib/api";
import type { Reservation } from "./types";

// rezervacija spremeni katalog, stran knjige in Mojo knjižnico; osvežimo jih
// tudi ob napaki, ker je zavrnitev lahko posledica zastarelih podatkov
function useRefresh() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: bookKeys.all }),
      queryClient.invalidateQueries({ queryKey: meKeys.all }),
    ]);
}

export function useCreateReservation() {
  const refresh = useRefresh();
  return useMutation<Reservation, ApiError, string>({
    mutationFn: (bookId) =>
      api<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify({ bookId }),
      }),
    onSettled: refresh,
  });
}

export function useCancelReservation() {
  const refresh = useRefresh();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api<void>(`/reservations/${id}`, { method: "DELETE" }),
    onSettled: refresh,
  });
}
