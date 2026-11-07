"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// napaka 4xx (npr. knjiga ne obstaja) se ob ponovitvi ne spremeni
function shouldRetry(failureCount: number, error: Error) {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 3;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: shouldRetry } },
      }),
  );

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    // ob vsaki odjavi, tudi zaradi 401, pozabi podatke prejšnjega uporabnika
    return useAuthStore.subscribe((state, previous) => {
      if (previous.token && !state.token) queryClient.clear();
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
