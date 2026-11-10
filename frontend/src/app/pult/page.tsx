import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";
import { STAFF_ROLES } from "@/features/auth/roles";
import { LoanPanel } from "@/features/loans/LoanPanel";
import { ReturnPanel } from "@/features/loans/ReturnPanel";

export const metadata: Metadata = { title: "Pult" };

export default function DeskPage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      <PageHeader title="Pult" description="Evidentiranje izposoj in vračil." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <LoanPanel />
        <ReturnPanel />
      </div>
    </RequireRole>
  );
}
