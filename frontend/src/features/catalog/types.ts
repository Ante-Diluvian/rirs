import type { MyReservation } from "@/features/reservations/types";

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

// prosti izvodi, vsi razen izgubljenih in čakajoči bralci
export interface Availability {
  availableCopies: number;
  totalCopies: number;
  queueLength: number;
}

// rezervacija prijavljenega bralca, null, če je nima
export interface WithMyReservation {
  myReservation: MyReservation | null;
}

export interface BookDetail extends Book, Availability, WithMyReservation {
  // rok za prevzem iz nastavitve pickup_days
  pickupDays: number;
}

export interface BookListItem extends Availability, WithMyReservation {
  id: string;
  title: string;
  isbn: string;
  genre: string;
  publicationYear: number | null;
  authors: AuthorName[];
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
  genre?: string;
  available?: boolean;
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
