import type { Role } from "@/stores/auth-store";

export function homePath(role: Role): string {
  return role === "READER" ? "/katalog" : "/pult";
}
