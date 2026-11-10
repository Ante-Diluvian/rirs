import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-medium">{title}</h1>
        {description && <p className="text-sm text-zinc-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
