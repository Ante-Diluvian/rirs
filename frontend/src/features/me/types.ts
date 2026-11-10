import type { AuthorName } from "@/features/catalog/types";
import type { MyReservation } from "@/features/reservations/types";

export interface BookRef {
  id: string;
  title: string;
  authors: AuthorName[];
}

// zamujenost in zamudnino izračuna backend glede na današnji dan
export interface MyLoan {
  id: string;
  book: BookRef;
  loanedOn: string;
  dueDate: string;
  daysLeft: number;
  isOverdue: boolean;
  overdueDays: number;
  fine: string;
  dueSoon: boolean;
}

export interface MyReservationItem extends MyReservation {
  book: BookRef;
  reservedOn: string;
}

export interface MySummary {
  today: string;
  activeLoans: number;
  maxActiveLoans: number;
  activeReservations: number;
  maxActiveReservations: number;
  unpaidFine: string;
  fineLimit: string;
  // zamudnina je nad mejo fine_limit
  borrowingBlocked: boolean;
}
