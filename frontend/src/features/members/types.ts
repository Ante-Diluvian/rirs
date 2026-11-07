import type { Role } from "@/stores/auth-store";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface MemberSummary extends Member {
  activeLoans: number;
  maxActiveLoans: number;
  unpaidFine: string;
  isBlocked: boolean;
}
