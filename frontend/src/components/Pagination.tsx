interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

// prva, zadnja in sosednje strani, vmes »…«
function visiblePages(page: number, pageCount: number): (number | null)[] {
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  return pages.flatMap((p, i) =>
    i > 0 && p - pages[i - 1] > 1 ? [null, p] : [p],
  );
}

const base =
  "min-w-8 rounded border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none";
const idle = `${base} border-zinc-400 bg-white hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40`;
const current = `${base} border-zinc-800 bg-zinc-800 text-white`;

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Strani" className="flex justify-center">
      <ul className="flex items-center gap-1.5">
        <li>
          <button
            type="button"
            aria-label="Prejšnja stran"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            className={idle}
          >
            ‹
          </button>
        </li>
        {visiblePages(page, pageCount).map((p, i) => (
          <li key={p ?? `gap-${i}`}>
            {p === null ? (
              <span className="px-1 text-zinc-500">…</span>
            ) : (
              <button
                type="button"
                aria-current={p === page ? "page" : undefined}
                onClick={() => onChange(p)}
                className={p === page ? current : idle}
              >
                {p}
              </button>
            )}
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label="Naslednja stran"
            disabled={page >= pageCount}
            onClick={() => onChange(page + 1)}
            className={idle}
          >
            ›
          </button>
        </li>
      </ul>
    </nav>
  );
}
