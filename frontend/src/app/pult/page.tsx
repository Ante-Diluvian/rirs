import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";
import { STAFF_ROLES } from "@/features/auth/roles";
import { LoanPanel } from "@/features/loans/LoanPanel";

export const metadata: Metadata = { title: "Pult" };

export default function DeskPage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      <PageHeader title="Pult" description="Evidentiranje izposoj in vračil." />
      {/* plošča Vračilo pride v desni stolpec s T29 */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <LoanPanel />
      </div>
    </RequireRole>
  );
}
