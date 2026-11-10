"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { NotFoundMessage } from "@/components/NotFoundMessage";
import { useAuthHydrated, useAuthStore, type Role } from "@/stores/auth-store";

interface RequireRoleProps {
  // brez vlog zadostuje prijava
  roles?: readonly Role[];
  children: ReactNode;
}

// samo prikaz, dostop vedno preveri tudi backend (ADR-0016)
export function RequireRole({ roles, children }: RequireRoleProps) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) router.replace("/prijava");
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;
  // US-01 AC5: stran druge vloge je videti, kot da ne obstaja
  if (roles && !roles.includes(user.role)) return <NotFoundMessage />;
  return children;
}
