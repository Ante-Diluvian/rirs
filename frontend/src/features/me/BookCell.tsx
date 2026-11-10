import Link from "next/link";
import { authorNames } from "@/features/catalog/format";
import type { BookRef } from "./types";

// details so podatki skritih stolpcev, prikazani samo na ozkem zaslonu
export function BookCell({
  book,
  details,
}: {
  book: BookRef;
  details: [label: string, date: string][];
}) {
  return (
    <>
      <Link href={`/knjige/${book.id}`} className="hover:underline">
        {book.title}
      </Link>
      <p className="text-xs text-zinc-600">{authorNames(book.authors)}</p>
      {details.map(([label, date]) => (
        <p key={label} className="mt-1 text-xs text-zinc-600 sm:hidden">
          {label} <span className="whitespace-nowrap">{date}</span>
        </p>
      ))}
    </>
  );
}
