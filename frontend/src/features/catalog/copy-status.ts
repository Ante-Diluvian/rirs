import type { CopyStatus } from "./types";

export const copyStatusLabels: Record<CopyStatus, string> = {
  AVAILABLE: "Prost",
  ON_LOAN: "Izposojen",
  RESERVED: "Rezerviran",
  LOST: "Izgubljen",
};

// izposojen in rezerviran izvod spreminjata samo izposoja in vračilo
export const MANUAL_COPY_STATUSES = ["AVAILABLE", "LOST"] as const;

export type ManualCopyStatus = (typeof MANUAL_COPY_STATUSES)[number];

export function isManualStatus(status: CopyStatus): status is ManualCopyStatus {
  return (MANUAL_COPY_STATUSES as readonly CopyStatus[]).includes(status);
}
