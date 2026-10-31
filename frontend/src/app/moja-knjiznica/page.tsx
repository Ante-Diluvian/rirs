import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { RequireRole } from "@/features/auth/RequireRole";

export const metadata: Metadata = { title: "Moja knjižnica" };

export default function MyLibraryPage() {
  return (
    <RequireRole roles={["READER"]}>
      <PageHeader title="Moja knjižnica" />
    </RequireRole>
  );
}
