// podatki Moje knjižnice (izposoje, rezervacije, povzetek)
export const meKeys = {
  all: ["me"] as const,
  loans: () => [...meKeys.all, "loans"] as const,
  reservations: () => [...meKeys.all, "reservations"] as const,
  summary: () => [...meKeys.all, "summary"] as const,
};
