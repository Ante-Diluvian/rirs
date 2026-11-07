export const memberKeys = {
  all: ["members"] as const,
  search: (q: string) => [...memberKeys.all, "search", q] as const,
  summary: (id: string) => [...memberKeys.all, "summary", id] as const,
};
