// knjige nimajo naslovnic, zato je povsod nadomestni okvir kot na wireframe-ih
export function CoverPlaceholder({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 52 72"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`shrink-0 border border-zinc-400 bg-zinc-100 text-zinc-400 ${className}`}
    >
      <path
        d="M0 0L52 72M52 0L0 72"
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
