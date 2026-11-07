const pluralRules = new Intl.PluralRules("sl-SI");
const pluralForms: Partial<Record<Intl.LDMLPluralRule, number>> = {
  one: 0,
  two: 1,
  few: 2,
};

// slovenska množina: 1, 2, 3–4 in 5 ali več, npr. zadetek, zadetka, zadetki, zadetkov
export function plural(
  n: number,
  forms: [one: string, two: string, few: string, other: string],
) {
  return forms[pluralForms[pluralRules.select(n)] ?? 3];
}

// »2026-11-02« → »2. 11. 2026«
export function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day}. ${month}. ${year}`;
}

const euro = new Intl.NumberFormat("sl-SI", {
  style: "currency",
  currency: "EUR",
});

// »0.50« → »0,50 €«
export function formatMoney(amount: string) {
  return euro.format(Number(amount));
}
