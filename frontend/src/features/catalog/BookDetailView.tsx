"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useId } from "react";
import { Alert } from "@/components/Alert";
import { NotFoundMessage } from "@/components/NotFoundMessage";
import { ReservationControl } from "@/features/reservations/ReservationControl";
import { plural } from "@/lib/format";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { CoverPlaceholder } from "./CoverPlaceholder";
import { authorNames } from "./format";
import { useBook } from "./hooks";
import type { Availability, BookDetail } from "./types";

function availabilityText({
  availableCopies,
  totalCopies,
  queueLength,
}: Availability) {
  if (totalCopies === 0) return "Knjiga še nima izvodov.";
  const queue =
    queueLength === 0
      ? "Čakalne vrste ni."
      : `V čakalni vrsti ${plural(queueLength, ["je", "sta", "so", "je"])} ${queueLength} ${plural(queueLength, ["bralec", "bralca", "bralci", "bralcev"])}.`;
  return availableCopies === 0 ? `Noben izvod ni prost. ${queue}` : queue;
}

// US-02 AC3: prosti izvodi od vseh in dolžina vrste
function AvailabilityPanel({ book }: { book: BookDetail }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-2 self-start rounded-md border border-zinc-400 bg-zinc-100 p-4"
    >
      <h2 id={headingId} className="text-lg">
        Razpoložljivost
      </h2>
      <AvailabilityBadge {...book} />
      <p className="text-sm text-zinc-700">{availabilityText(book)}</p>
      <ReservationControl
        book={book}
        pickupDays={book.pickupDays}
        className="pt-2"
      />
    </section>
  );
}

export function BookDetailView() {
  const { id } = useParams<{ id: string }>();
  const book = useBook(id);

  if (book.isPending) {
    return <p className="text-sm text-zinc-600">Nalaganje …</p>;
  }
  if (book.isError) {
    return book.error.status === 404 ? (
      <NotFoundMessage message={book.error.message} />
    ) : (
      <Alert>{book.error.message}</Alert>
    );
  }

  const { title, authors, publicationYear, genre, isbn, language } = book.data;
  const details: [string, string | number | null][] = [
    ["Leto izida", publicationYear],
    ["Žanr", genre],
    ["ISBN", isbn],
    ["Jezik", language],
  ];

  return (
    <div className="space-y-4">
      <nav aria-label="Drobtinice" className="text-xs text-zinc-600">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/katalog" className="hover:underline">
              Katalog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="flex flex-col gap-6 sm:flex-row">
          <CoverPlaceholder className="h-60 w-44" />
          <div className="min-w-0 space-y-4">
            <div>
              <h1 className="text-3xl">{title}</h1>
              <p className="mt-1 text-zinc-600">{authorNames(authors)}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              {details
                .filter(([, value]) => value !== null)
                .map(([label, value]) => (
                  <Fragment key={label}>
                    <dt className="text-zinc-600">{label}</dt>
                    <dd>{value}</dd>
                  </Fragment>
                ))}
            </dl>
            {book.data.description && (
              <p className="max-w-prose text-sm whitespace-pre-line text-zinc-800">
                {book.data.description}
              </p>
            )}
          </div>
        </article>
        <AvailabilityPanel book={book.data} />
      </div>
    </div>
  );
}
