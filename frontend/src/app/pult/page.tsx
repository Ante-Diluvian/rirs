import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";
import { STAFF_ROLES } from "@/features/auth/roles";

export const metadata: Metadata = { title: "Pult" };

export default function DeskPage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      <PageHeader title="Pult" description="Evidentiranje izposoj in vračil." />
    </RequireRole>
  );
}
