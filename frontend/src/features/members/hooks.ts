import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { memberKeys } from "./keys";
import type { Member, MemberSummary } from "./types";

export function useMemberSearch(q: string) {
  return useQuery<Member[], ApiError>({
    queryKey: memberKeys.search(q),
    queryFn: () => api<Member[]>(`/members?${new URLSearchParams({ q })}`),
    enabled: q !== "",
    placeholderData: keepPreviousData,
  });
}

export function useMemberSummary(id: string | null) {
  return useQuery<MemberSummary, ApiError>({
    queryKey: memberKeys.summary(id ?? ""),
    queryFn: () => api<MemberSummary>(`/members/${id}/summary`),
    enabled: id !== null,
  });
}
