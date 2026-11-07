import Link from "next/link";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { CoverPlaceholder } from "./CoverPlaceholder";
import { authorNames } from "./format";
import type { BookListItem } from "./types";

export function BookResult({ book }: { book: BookListItem }) {
  const details = [
    authorNames(book.authors),
    book.publicationYear,
    book.genre,
  ].filter(Boolean);

  return (
    <li className="relative flex flex-wrap items-center gap-x-4 gap-y-2 px-2.5 py-3 hover:bg-zinc-50">
      <CoverPlaceholder className="h-18 w-13" />
      <div className="min-w-0 flex-1">
        <h2>
          {/* celoten zadetek je povezava na stran knjige */}
          <Link
            href={`/knjige/${book.id}`}
            className="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-zinc-400"
          >
            {book.title}
          </Link>
        </h2>
        <p className="text-sm text-zinc-600">{details.join(", ")}</p>
      </div>
      {/* US-02 AC3: »2 v vrsti« */}
      <div className="shrink-0 text-xs sm:w-36">
        <AvailabilityBadge {...book} />
        <p className="mt-1 text-zinc-600">
          {book.queueLength > 0 ? `${book.queueLength} v vrsti` : "brez vrste"}
        </p>
      </div>
    </li>
  );
}
