import type { Metadata } from "next";
import { AuthPanel } from "@/features/auth/AuthPanel";

export const metadata: Metadata = { title: "Prijava" };

export default function LoginPage() {
  return <AuthPanel />;
}
