// iskalni niz kot ISBN-13; v bazi so samo 13-mestni, zato se ISBN-10 pretvori
export function toIsbn13(query: string): string | null {
  const value = query.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(value)) return value;
  if (!/^\d{9}[\dX]$/.test(value) || !isValidIsbn10(value)) return null;

  const core = `978${value.slice(0, 9)}`;
  const sum = [...core].reduce(
    (total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1),
    0,
  );
  return `${core}${(10 - (sum % 10)) % 10}`;
}

function isValidIsbn10(value: string): boolean {
  const sum = [...value].reduce(
    (total, char, i) => total + (char === 'X' ? 10 : Number(char)) * (10 - i),
    0,
  );
  return sum % 11 === 0;
}
