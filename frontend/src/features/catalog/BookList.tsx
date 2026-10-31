"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/Alert";
import { Pagination } from "@/components/Pagination";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { authorNames } from "./format";
import { useBooks } from "./hooks";

// US-02 AC1: iskanje šele od 3 znakov naprej
const MIN_QUERY_LENGTH = 3;

interface BookListProps {
  selectedId: string | null;
  onEdit: (id: string) => void;
}

export function BookList({ selectedId, onEdit }: BookListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const navigate = useCallback(
    (nextQ: string, nextPage: number) => {
      const params = new URLSearchParams();
      if (nextQ) params.set("q", nextQ);
      if (nextPage > 1) params.set("page", String(nextPage));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  useEffect(() => {
    if (debouncedSearch !== q) navigate(debouncedSearch, 1);
  }, [debouncedSearch, q, navigate]);

  const books = useBooks({
    q: q.length >= MIN_QUERY_LENGTH ? q : "",
    page,
  });
  const pageCount = books.data
    ? Math.ceil(books.data.total / books.data.pageSize)
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="book-search" className="sr-only">
          Išči po naslovu, avtorju ali ISBN
        </label>
        <input
          id="book-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Išči po naslovu, avtorju ali ISBN"
          className="block w-full rounded-md border border-zinc-400 bg-white px-3 py-2 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      {books.isPending ? (
        <p className="text-sm text-zinc-600">Nalaganje …</p>
      ) : books.isError ? (
        <Alert>{books.error.message}</Alert>
      ) : books.data.items.length === 0 ? (
        <p className="py-6 text-center text-zinc-600">
          Nobena knjiga ne ustreza iskanju
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-zinc-600 bg-zinc-100 text-xs text-zinc-600">
              <tr>
                <th scope="col" className="px-2.5 py-2 font-normal">
                  Naslov
                </th>
                <th scope="col" className="px-2.5 py-2 font-normal">
                  Avtorji
                </th>
                <th scope="col" className="px-2.5 py-2 font-normal">
                  ISBN
                </th>
                <th scope="col" className="px-2.5 py-2 text-right font-normal">
                  Izvodi
                </th>
                <th scope="col" className="px-2.5 py-2">
                  <span className="sr-only">Uredi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300 border-b border-zinc-300">
              {books.data.items.map((book) => (
                <tr
                  key={book.id}
                  className={book.id === selectedId ? "bg-zinc-100" : undefined}
                >
                  <td className="px-2.5 py-2.5">{book.title}</td>
                  <td className="px-2.5 py-2.5">{authorNames(book.authors)}</td>
                  <td className="px-2.5 py-2.5 tabular-nums">{book.isbn}</td>
                  <td className="px-2.5 py-2.5 text-right whitespace-nowrap tabular-nums">
                    {book.availableCopies} od {book.totalCopies}
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(book.id)}
                      className="underline hover:text-zinc-600"
                    >
                      Uredi<span className="sr-only"> knjigo {book.title}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        onChange={(nextPage) => navigate(q, nextPage)}
      />
    </div>
  );
}
