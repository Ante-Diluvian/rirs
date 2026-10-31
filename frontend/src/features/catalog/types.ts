export type CopyStatus = "AVAILABLE" | "ON_LOAN" | "RESERVED" | "LOST";

export interface AuthorName {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Book {
  id: string;
  title: string;
  isbn: string;
  genre: string;
  publicationYear: number | null;
  language: string | null;
  description: string | null;
  authors: AuthorName[];
}

// zadetek seznama knjig, kot ga potrebuje W-06
export interface BookListItem {
  id: string;
  title: string;
  isbn: string;
  authors: AuthorName[];
  availableCopies: number;
  totalCopies: number;
}

export interface BookPage {
  items: BookListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookListParams {
  q: string;
  page: number;
}

export interface SaveBookInput {
  title: string;
  authorIds: string[];
  genre: string;
  isbn: string;
  // neštevilski vnos preveri backend
  publicationYear: number | string | null;
  language: string | null;
  description: string | null;
}

export interface CreateAuthorInput {
  firstName: string;
  lastName: string;
}

export interface Copy {
  id: string;
  bookId: string;
  inventoryNumber: string;
  status: CopyStatus;
  shelf: string | null;
}

export interface CreateCopyInput {
  inventoryNumber: string;
  shelf: string;
}

export interface UpdateCopyInput {
  id: string;
  shelf: string;
  status?: "AVAILABLE" | "LOST";
}
