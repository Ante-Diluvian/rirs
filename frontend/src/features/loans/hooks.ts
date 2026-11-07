import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { bookKeys } from "@/features/catalog/keys";
import { memberKeys } from "@/features/members/keys";
import { loanKeys } from "./keys";
import type { Loan, LoanCheck, LoanRequest } from "./types";

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
