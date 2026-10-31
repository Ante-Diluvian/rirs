import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";
import { STAFF_ROLES } from "@/features/auth/roles";

export const metadata: Metadata = { title: "Upravljanje kataloga" };

export default function CatalogManagementPage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      <PageHeader title="Katalog" />
    </RequireRole>
  );
}
