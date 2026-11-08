export type LoanRule =
  | "MEMBER_NOT_BLOCKED"
  | "MAX_ACTIVE_LOANS"
  | "FINE_LIMIT"
  | "COPY_AVAILABLE"
  | "SAME_TITLE";

// message je ime pravila, če je izpolnjeno, sicer razlog
export interface LoanRuleCheck {
  rule: LoanRule;
  passed: boolean;
  message: string;
}

export interface LoanCheck {
  checks: LoanRuleCheck[];
  dueDate: string;
  loanPeriodDays: number;
}

export interface LoanRequest {
  memberId: string;
  inventoryNumber: string;
}

export interface Loan {
  id: string;
  memberId: string;
  inventoryNumber: string;
  title: string;
  loanedOn: string;
  dueDate: string;
  status: "ACTIVE" | "OVERDUE" | "RETURNED";
}

export interface LoanMember {
  id: string;
  firstName: string;
  lastName: string;
}

// zamudnina, če bi izvod vrnili danes
export interface ReturnPreview {
  loanId: string;
  inventoryNumber: string;
  title: string;
  member: LoanMember;
  loanedOn: string;
  dueDate: string;
  returnedOn: string;
  overdueDays: number;
  finePerDay: string;
  fine: string;
}

export interface ReservedFor {
  reservationId: string;
  memberId: string;
  firstName: string;
  lastName: string;
  readyUntil: string;
}

// reservedFor je null, ko je izvod spet prost
export interface ReturnResult extends ReturnPreview {
  copyStatus: "AVAILABLE" | "RESERVED";
  reservedFor: ReservedFor | null;
}
