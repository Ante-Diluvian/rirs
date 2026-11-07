import { Prisma } from '../generated/prisma/client';
import { decimalToCents, formatCents, parseCents } from './money';

describe('money', () => {
  it('parseCents pretvori znesek v cente', () => {
    expect(parseCents('0.10')).toBe(10);
    expect(parseCents('5.00')).toBe(500);
    expect(parseCents('5.01')).toBe(501);
    expect(parseCents('5.1')).toBe(510);
    expect(parseCents('5')).toBe(500);
    expect(parseCents('0')).toBe(0);
    expect(parseCents('123.45')).toBe(12345);
  });

  it('parseCents zavrne negativen znesek, več decimalk in besedilo', () => {
    for (const amount of [
      '-0.10',
      '0.105',
      '0,10',
      '.5',
      '5.',
      ' 5',
      '1e2',
      'abc',
      '',
      '99999999999999999999',
    ]) {
      expect(parseCents(amount)).toBeNull();
    }
  });

  it('formatCents vrne znesek z dvema decimalkama', () => {
    expect(formatCents(0)).toBe('0.00');
    expect(formatCents(10)).toBe('0.10');
    expect(formatCents(50)).toBe('0.50');
    expect(formatCents(500)).toBe('5.00');
    expect(formatCents(501)).toBe('5.01');
    expect(formatCents(12345)).toBe('123.45');
  });

  it('pretvorba v cente in nazaj ohrani znesek', () => {
    for (const amount of ['0.00', '0.10', '0.30', '5.00', '5.01', '19.99']) {
      expect(formatCents(parseCents(amount)!)).toBe(amount);
    }
  });

  it('decimalToCents pretvori znesek iz baze v cente', () => {
    expect(decimalToCents(new Prisma.Decimal('0.30'))).toBe(30);
    expect(decimalToCents(new Prisma.Decimal('5.01'))).toBe(501);
    expect(decimalToCents(new Prisma.Decimal('0'))).toBe(0);
    expect(decimalToCents(new Prisma.Decimal('123456.78'))).toBe(12345678);
  });
});
