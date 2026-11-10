import type { LoanRequest } from "./types";

export const loanKeys = {
  all: ["loans"] as const,
  check: (request: LoanRequest) => [...loanKeys.all, "check", request] as const,
  returnPreview: (inventoryNumber: string) =>
    [...loanKeys.all, "return-preview", inventoryNumber] as const,
};
