"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

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
