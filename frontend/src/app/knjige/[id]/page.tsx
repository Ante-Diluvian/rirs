import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/RequireRole";
import { BookDetailView } from "@/features/catalog/BookDetailView";

export const metadata: Metadata = { title: "Podrobnosti knjige" };

export default function BookPage() {
  return (
    <RequireRole>
      <BookDetailView />
    </RequireRole>
  );
}
