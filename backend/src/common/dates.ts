// en-CA oblikuje datum kot YYYY-MM-DD
export function todayInLjubljana(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Ljubljana',
  }).format(now);
}

// računamo v UTC, da premik ure ne vpliva na rezultat
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(later: string, earlier: string): number {
  return Math.round(
    (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) /
      86_400_000,
  );
}

// Prisma vrača in sprejema polja @db.Date kot Date ob polnoči UTC
export function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
