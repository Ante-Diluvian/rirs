import { diffDays } from '../common/dates';

// US-06 AC2: rok v naslednjih 3 dneh, to ni nastavitev v tabeli setting
export const DUE_SOON_DAYS = 3;

export interface LoanDeadline {
  daysLeft: number;
  isOverdue: boolean;
  dueSoon: boolean;
}

// datumi so koledarski dnevi v Ljubljani (YYYY-MM-DD)
export function loanDeadline(dueDate: string, today: string): LoanDeadline {
  const days = diffDays(dueDate, today);
  const isOverdue = days < 0;
  return {
    daysLeft: Math.max(0, days),
    isOverdue,
    dueSoon: !isOverdue && days <= DUE_SOON_DAYS,
  };
}
