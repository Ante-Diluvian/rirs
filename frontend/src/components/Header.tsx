import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-300 bg-zinc-100">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-medium text-zinc-900"
        >
          <span
            aria-hidden="true"
            className="inline-block size-4 rounded-sm border-2 border-zinc-900"
          />
          Librarium
        </Link>
      </div>
    </header>
  );
}
