"use client";

import { useId, useState, type ChangeEvent, type SubmitEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { formErrors } from "@/lib/api";
import { AuthorPicker } from "./AuthorPicker";
import { CopyList } from "./CopyList";
import { useBook, useDeleteBook, useGenres, useSaveBook } from "./hooks";
import type { AuthorName, Book } from "./types";

interface BookPanelProps {
  // null odpre prazen obrazec za novo knjigo
  bookId: string | null;
  onSaved: (id: string) => void;
  onClose: () => void;
}

export function BookPanel({ bookId, onSaved, onClose }: BookPanelProps) {
  return (
    <section className="rounded-md border border-zinc-400 bg-white p-4">
      {bookId === null ? (
        <BookEditor book={null} onSaved={onSaved} onClose={onClose} />
      ) : (
        <ExistingBook bookId={bookId} onSaved={onSaved} onClose={onClose} />
      )}
    </section>
  );
}

function ExistingBook({
  bookId,
  ...props
}: Omit<BookPanelProps, "bookId"> & { bookId: string }) {
  const book = useBook(bookId);
  if (book.isPending)
    return <p className="text-sm text-zinc-600">Nalaganje …</p>;
  if (book.isError) return <Alert>{book.error.message}</Alert>;
  return <BookEditor book={book.data} {...props} />;
}

interface BookForm {
  title: string;
  authors: AuthorName[];
  genre: string;
  publicationYear: string;
  isbn: string;
}

type TextField = Exclude<keyof BookForm, "authors">;

function toForm(book: Book | null): BookForm {
  return {
    title: book?.title ?? "",
    authors: book?.authors ?? [],
    genre: book?.genre ?? "",
    publicationYear: book?.publicationYear?.toString() ?? "",
    isbn: book?.isbn ?? "",
  };
}

// prazno leto je null, neštevilski vnos zavrne backend ob polju
function toYear(value: string): number | string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

interface BookEditorProps {
  book: Book | null;
  onSaved: (id: string) => void;
  onClose: () => void;
}

function BookEditor({ book, onSaved, onClose }: BookEditorProps) {
  const formId = useId();
  const genreListId = useId();
  const save = useSaveBook(book?.id ?? null);
  const remove = useDeleteBook();
  const genres = useGenres();
  const [form, setForm] = useState(() => toForm(book));
  const errors = formErrors(save.error);
  // US-07 AC3: knjige z zgodovino ni mogoče izbrisati, razlog ostane izpisan
  const deleteRefused = remove.error?.status === 409;

  function field(name: TextField) {
    return {
      value: form[name],
      error: errors.fields[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        setForm((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(
      {
        title: form.title,
        authorIds: form.authors.map((author) => author.id),
        genre: form.genre,
        isbn: form.isbn,
        publicationYear: toYear(form.publicationYear),
        // jezika in opisa ni na W-06, PUT bi ju brez njiju izpraznil
        language: book?.language ?? null,
        description: book?.description ?? null,
      },
      {
        onSuccess: (saved) => {
          setForm(toForm(saved));
          onSaved(saved.id);
        },
      },
    );
  }

  function onDelete() {
    if (!book || !window.confirm(`Izbrišem knjigo »${book.title}«?`)) return;
    remove.mutate(book.id, { onSuccess: onClose });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg">
        {book ? `Uredi knjigo: ${book.title}` : "Dodaj knjigo"}
      </h2>

      <form id={formId} noValidate onSubmit={onSubmit} className="space-y-4">
        <Input label="Naslov" {...field("title")} />
        <AuthorPicker
          value={form.authors}
          error={errors.fields.authorIds}
          onChange={(authors) =>
            setForm((current) => ({ ...current, authors }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Žanr" list={genreListId} {...field("genre")} />
          <Input
            label="Leto izida"
            inputMode="numeric"
            {...field("publicationYear")}
          />
        </div>
        <datalist id={genreListId}>
          {genres.data?.map((genre) => (
            <option key={genre} value={genre} />
          ))}
        </datalist>
        <Input label="ISBN (13 števk)" {...field("isbn")} />
      </form>

      {book && <CopyList bookId={book.id} />}

      {errors.message && <Alert>{errors.message}</Alert>}
      {remove.error && <Alert>{remove.error.message}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        {book && (
          <Button
            variant="secondary"
            onClick={onDelete}
            disabled={remove.isPending || deleteRefused}
          >
            Izbriši knjigo
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Prekliči
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            Shrani
          </Button>
        </div>
      </div>
    </div>
  );
}
