import { addDays, diffDays, toDbDate, todayInLjubljana } from './dates';

describe('dates', () => {
  it('todayInLjubljana vrne koledarski datum v Ljubljani', () => {
    expect(todayInLjubljana(new Date('2026-10-12T10:00:00Z'))).toBe(
      '2026-10-12',
    );
    // 23.30 UTC je v Ljubljani že naslednji dan
    expect(todayInLjubljana(new Date('2026-10-12T22:30:00Z'))).toBe(
      '2026-10-13',
    );
    expect(todayInLjubljana(new Date('2026-12-31T23:30:00Z'))).toBe(
      '2027-01-01',
    );
  });

  it('addDays upošteva konec meseca, prestopni dan in prehod na zimski čas', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-10-12', 21)).toBe('2026-11-02');
    expect(addDays('2026-10-12', -5)).toBe('2026-10-07');
  });

  it('diffDays šteje koledarske dni tudi čez prehod na zimski čas', () => {
    expect(diffDays('2026-10-12', '2026-10-07')).toBe(5);
    expect(diffDays('2026-10-26', '2026-10-24')).toBe(2);
    expect(diffDays('2026-10-07', '2026-10-12')).toBe(-5);
  });

  it('toDbDate vrne polnoč UTC', () => {
    expect(toDbDate('2026-10-12').toISOString()).toBe(
      '2026-10-12T00:00:00.000Z',
    );
  });
});
