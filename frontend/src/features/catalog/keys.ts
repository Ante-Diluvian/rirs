import type { BookListParams } from "./types";

export const bookKeys = {
  all: ["books"] as const,
  lists: () => [...bookKeys.all, "list"] as const,
  list: (params: BookListParams) => [...bookKeys.lists(), params] as const,
  detail: (id: string) => [...bookKeys.all, "detail", id] as const,
  copies: (id: string) => [...bookKeys.detail(id), "copies"] as const,
};

export const authorKeys = {
  all: ["authors"] as const,
  search: (q: string) => [...authorKeys.all, q] as const,
};

export const genreKeys = {
  all: ["genres"] as const,
};
