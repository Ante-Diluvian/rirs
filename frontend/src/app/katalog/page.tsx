import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";
import { CatalogSearch } from "@/features/catalog/CatalogSearch";

export const metadata: Metadata = { title: "Katalog" };

export default function CatalogPage() {
  return (
    <RequireRole>
      <PageHeader
        title="Katalog"
        description="Poišči knjigo po naslovu, avtorju, žanru ali ISBN."
      />
      {/* iskalni niz, filtra in stran so v URL (useSearchParams) */}
      <Suspense>
        <CatalogSearch />
      </Suspense>
    </RequireRole>
  );
}
