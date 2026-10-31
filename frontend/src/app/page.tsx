"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homePath } from "@/features/auth/home-path";
import { useAuthHydrated, useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (hydrated) router.replace(user ? homePath(user.role) : "/prijava");
  }, [hydrated, user, router]);

  return null;
}
