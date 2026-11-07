"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Pagination } from "@/components/Pagination";
import { Select } from "@/components/Select";
import { plural } from "@/lib/format";
import { BookResult } from "./BookResult";
import { useBooks, useGenres } from "./hooks";
import { MIN_QUERY_LENGTH, searchQuery } from "./search";

interface Filters {
  q: string;
  genre: string;
  available: boolean;
}

const NO_FILTERS: Filters = { q: "", genre: "", available: false };

export function CatalogSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const applied: Filters = {
    q: (searchParams.get("q") ?? "").trim(),
    genre: searchParams.get("genre") ?? "",
    available: searchParams.get("available") === "true",
  };
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [form, setForm] = useState(applied);
  const [queryError, setQueryError] = useState<string>();

  const books = useBooks({
    q: searchQuery(applied.q),
    page,
    genre: applied.genre,
    available: applied.available,
  });
  const genres = useGenres();
  const pageCount = books.data
    ? Math.ceil(books.data.total / books.data.pageSize)
    : 0;

  function navigate(filters: Filters, nextPage = 1) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.available) params.set("available", "true");
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  // US-02 AC2: sprememba filtra takoj osveži rezultate z vpisanim nizom
  function apply(next: Filters) {
    setForm(next);
    const q = next.q.trim();
    if (q.length > 0 && q.length < MIN_QUERY_LENGTH) {
      setQueryError("Iskalni niz mora imeti vsaj 3 znake");
      return;
    }
    setQueryError(undefined);
    navigate({ ...next, q });
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(form);
  }

  function clearFilters() {
    setForm(NO_FILTERS);
    setQueryError(undefined);
    navigate(NO_FILTERS);
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        noValidate
        onSubmit={onSubmit}
        className="flex flex-wrap items-start gap-3 rounded-md border border-zinc-400 bg-zinc-100 p-4"
      >
        <Input
          label="Iskanje"
          type="search"
          value={form.q}
          error={queryError}
          onChange={(event) => setForm({ ...form, q: event.target.value })}
          className="min-w-60 flex-1"
        />
        <Select
          label="Žanr"
          value={form.genre}
          onChange={(event) => apply({ ...form, genre: event.target.value })}
          className="w-full sm:w-56"
        >
          <option value="">Vsi žanri</option>
          {genres.data?.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </Select>
        {/* poravnano s polji pod oznakami, tudi ko je pod iskalnim poljem napaka */}
        <label className="flex items-center gap-2 py-2 sm:mt-6">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(event) =>
              apply({ ...form, available: event.target.checked })
            }
            className="size-4 accent-zinc-800"
          />
          Samo s prostim izvodom
        </label>
        <Button type="submit" variant="secondary" className="sm:mt-6">
          Išči
        </Button>
      </form>

      {books.isPending ? (
        <p className="text-sm text-zinc-600">Nalaganje …</p>
      ) : books.isError ? (
        <Alert>{books.error.message}</Alert>
      ) : books.data.items.length === 0 ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-zinc-600">Nobena knjiga ne ustreza iskanju</p>
          <Button variant="secondary" onClick={clearFilters}>
            Počisti filtre
          </Button>
        </div>
      ) : (
        <section aria-label="Zadetki">
          {/* US-02 AC4: skupno število zadetkov nad seznamom */}
          <p className="border-b-2 border-zinc-600 pb-2 text-sm">
            {books.data.total}{" "}
            {plural(books.data.total, [
              "zadetek",
              "zadetka",
              "zadetki",
              "zadetkov",
            ])}
          </p>
          <ul className="divide-y divide-zinc-300 border-b border-zinc-300">
            {books.data.items.map((book) => (
              <BookResult key={book.id} book={book} />
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={(nextPage) => navigate(applied, nextPage)}
        />
        {pageCount > 1 && (
          <span className="text-xs text-zinc-600">
            {books.data?.pageSize} zadetkov na stran
          </span>
        )}
      </div>
    </div>
  );
}
