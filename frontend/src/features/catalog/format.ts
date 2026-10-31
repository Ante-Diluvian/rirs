import type { AuthorName } from "./types";

export function authorName(author: AuthorName) {
  return `${author.firstName} ${author.lastName}`.trim();
}

export function authorNames(authors: AuthorName[]) {
  return authors.map(authorName).join(", ");
}
