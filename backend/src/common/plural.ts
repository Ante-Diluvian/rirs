const rules = new Intl.PluralRules('sl');
const FORM = { one: 0, two: 1, few: 2 } as const;

// oblike za 1, 2, 3 in 4 ter 5 ali več (101 kot 1, 102 kot 2 …)
export function plural(
  n: number,
  forms: [one: string, two: string, few: string, other: string],
): string {
  const category = rules.select(n);
  return forms[category in FORM ? FORM[category as keyof typeof FORM] : 3];
}
