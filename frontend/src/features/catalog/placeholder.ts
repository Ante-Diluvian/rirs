import { api, ApiError } from "@/lib/api";
import { authorName } from "./format";
import type {
  Book,
  BookListItem,
  BookListParams,
  BookPage,
  Copy,
} from "./types";

// začasno do GET /books, GET /genres (T16) in GET /books/:id (T17)
// primeri niso v bazi, knjige, shranjene v tem zavihku, pa so prave

export const PAGE_SIZE = 20;

const GENRES = [
  "biografija",
  "drama",
  "fantastika",
  "kratka proza",
  "kriminalka",
  "mladinska",
  "poezija",
  "poljudna znanost",
  "roman",
  "zgodovinski roman",
  "znanstvena fantastika",
];

type SampleRow = [string, string, string, number, string, number, number];

// naslov, ime, priimek, leto, žanr, prosti in vsi izvodi
const sampleRows: SampleRow[] = [
  ["Alamut", "Vladimir", "Bartol", 1938, "zgodovinski roman", 1, 2],
  ["Na klancu", "Ivan", "Cankar", 1902, "roman", 2, 2],
  ["Visoška kronika", "Ivan", "Tavčar", 1919, "zgodovinski roman", 0, 1],
  ["Deseti brat", "Josip", "Jurčič", 1866, "roman", 2, 2],
  ["Cvetje v jeseni", "Ivan", "Tavčar", 1917, "roman", 0, 2],
];

const samples: (Book & BookListItem)[] = sampleRows.map(
  (
    [title, firstName, lastName, publicationYear, genre, available, total],
    i,
  ) => {
    const n = String(i + 1).padStart(3, "0");
    return {
      id: `00000000-0000-4000-8000-000000000${n}`,
      title,
      isbn: `9789610000${n}`,
      genre,
      publicationYear,
      language: "slovenščina",
      description: null,
      authors: [
        { id: `00000000-0000-4000-9000-000000000${n}`, firstName, lastName },
      ],
      availableCopies: available,
      totalCopies: total,
    };
  },
);

const savedBooks = new Map<string, Book>();

export function rememberBook(book: Book) {
  savedBooks.set(book.id, book);
}

export function forgetBook(id: string) {
  savedBooks.delete(id);
}

async function withCopyCounts(book: Book): Promise<BookListItem> {
  const copies = await api<Copy[]>(`/books/${book.id}/copies`);
  return {
    ...book,
    totalCopies: copies.filter((copy) => copy.status !== "LOST").length,
    availableCopies: copies.filter((copy) => copy.status === "AVAILABLE")
      .length,
  };
}

function matches(book: BookListItem, q: string) {
  if (!q) return true;
  const needle = q.toLocaleLowerCase("sl");
  const texts = [book.title, ...book.authors.map(authorName)];
  return (
    texts.some((text) => text.toLocaleLowerCase("sl").includes(needle)) ||
    book.isbn === q.replace(/[\s-]/g, "")
  );
}

export async function fetchBooks({
  q,
  page,
}: BookListParams): Promise<BookPage> {
  const saved = await Promise.all([...savedBooks.values()].map(withCopyCounts));
  const items = [...saved, ...samples]
    .filter((book) => matches(book, q))
    .sort((a, b) => a.title.localeCompare(b.title, "sl"));
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: items.slice(start, start + PAGE_SIZE),
    total: items.length,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function fetchBook(id: string): Promise<Book> {
  const book = savedBooks.get(id) ?? samples.find((item) => item.id === id);
  if (!book) throw new ApiError(404, "Knjiga ne obstaja.");
  return book;
}

export async function fetchGenres(): Promise<string[]> {
  return GENRES;
}
