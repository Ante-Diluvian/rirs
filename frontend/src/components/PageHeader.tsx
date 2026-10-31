export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-3xl font-medium">{title}</h1>
      {description && <p className="text-sm text-zinc-600">{description}</p>}
    </div>
  );
}
