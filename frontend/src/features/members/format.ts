import type { Member } from "./types";

// »Maja Kovač (maja.kovac@example.com)«
export function memberLabel(member: Member) {
  return `${member.firstName} ${member.lastName} (${member.email})`;
}
