import { Prisma } from '../generated/prisma/client';

const AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/;

// '0.10' -> 10, niz, ki ni znesek >= 0 z največ dvema decimalkama -> null
export function parseCents(amount: string): number | null {
  const match = AMOUNT.exec(amount);
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

// 50 -> '0.50', brez računanja s plavajočo vejico
export function formatCents(cents: number): string {
  const euros = Math.trunc(cents / 100);
  return `${euros}.${String(cents % 100).padStart(2, '0')}`;
}

// Decimal(8, 2) iz baze v cente
export function decimalToCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toNumber();
}
