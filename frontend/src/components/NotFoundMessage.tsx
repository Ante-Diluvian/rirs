export function NotFoundMessage({
  message = "Ta stran ne obstaja",
}: {
  message?: string;
}) {
  return (
    <section className="py-16 text-center">
      <h1 className="text-2xl font-medium">{message}</h1>
    </section>
  );
}
