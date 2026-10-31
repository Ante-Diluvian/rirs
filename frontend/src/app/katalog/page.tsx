import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";

export const metadata: Metadata = { title: "Katalog" };

export default function CatalogPage() {
  return (
    <RequireRole>
      <PageHeader
        title="Katalog"
        description="Poišči knjigo po naslovu, avtorju, žanru ali ISBN."
      />
    </RequireRole>
  );
}
