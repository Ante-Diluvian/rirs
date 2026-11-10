import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { bookKeys } from "@/features/catalog/keys";
import { memberKeys } from "@/features/members/keys";
import { loanKeys } from "./keys";
import type {
  Loan,
  LoanCheck,
  LoanRequest,
  ReturnPreview,
  ReturnResult,
} from "./types";

function post<T>(path: string, body: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

// null, dokler nista izbrana član in izvod
export function useLoanCheck(request: LoanRequest | null) {
  return useQuery<LoanCheck, ApiError>({
    queryKey: loanKeys.check(request ?? { memberId: "", inventoryNumber: "" }),
    queryFn: () => post<LoanCheck>("/loans/check", request),
    enabled: request !== null,
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation<Loan, ApiError, LoanRequest>({
    mutationFn: (request) => post("/loans", request),
    // tudi zavrnitev pomeni, da se je stanje medtem spremenilo
    onSettled: (_, __, request) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: loanKeys.all }),
        queryClient.invalidateQueries({
          queryKey: memberKeys.summary(request.memberId),
        }),
        queryClient.invalidateQueries({ queryKey: bookKeys.all }),
      ]),
  });
}

// null, dokler ni vnesena inventarna številka
export function useReturnPreview(inventoryNumber: string | null) {
  return useQuery<ReturnPreview, ApiError>({
    queryKey: loanKeys.returnPreview(inventoryNumber ?? ""),
    queryFn: () =>
      api<ReturnPreview>(
        `/loans/return-preview?${new URLSearchParams({ inventoryNumber: inventoryNumber ?? "" })}`,
      ),
    enabled: inventoryNumber !== null,
  });
}

export function useReturnCopy() {
  const queryClient = useQueryClient();
  return useMutation<ReturnResult, ApiError, string>({
    mutationFn: (inventoryNumber) => post("/loans/return", { inventoryNumber }),
    // vračilo spremeni zamudnino člana, stanje izvoda in čakalno vrsto
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: loanKeys.all }),
        queryClient.invalidateQueries({ queryKey: memberKeys.all }),
        queryClient.invalidateQueries({ queryKey: bookKeys.all }),
      ]),
  });
}
