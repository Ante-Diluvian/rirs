import type { LoanRequest } from "./types";

export const loanKeys = {
  all: ["loans"] as const,
  check: (request: LoanRequest) => [...loanKeys.all, "check", request] as const,
};
