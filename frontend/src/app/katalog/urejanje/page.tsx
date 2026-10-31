import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/features/auth/RequireRole";
import { STAFF_ROLES } from "@/features/auth/roles";
import { CatalogManagement } from "@/features/catalog/CatalogManagement";

export const metadata: Metadata = { title: "Upravljanje kataloga" };

export default function CatalogManagementPage() {
  return (
    <RequireRole roles={STAFF_ROLES}>
      {/* iskanje in stran sta v URL (useSearchParams) */}
      <Suspense>
        <CatalogManagement />
      </Suspense>
    </RequireRole>
  );
}
