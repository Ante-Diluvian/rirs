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
