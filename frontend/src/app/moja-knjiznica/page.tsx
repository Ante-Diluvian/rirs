import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/RequireRole";
import { MyLibrary } from "@/features/me/MyLibrary";

export const metadata: Metadata = { title: "Moja knjižnica" };

export default function MyLibraryPage() {
  return (
    <RequireRole roles={["READER"]}>
      <MyLibrary />
    </RequireRole>
  );
}
