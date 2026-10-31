import type { Role } from "@/stores/auth-store";

export const STAFF_ROLES: readonly Role[] = ["LIBRARIAN", "ADMIN"];

export const roleLabels: Record<Role, string> = {
  READER: "bralec",
  LIBRARIAN: "knjižničar",
  ADMIN: "administrator",
};
