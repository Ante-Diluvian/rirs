import { formatCents } from '../common/money';
import { FineCalculator } from './fine-calculator';

function fine(dueDate: string, returnedOn: string, finePerDayCents = 10) {
  return new FineCalculator().calculate(dueDate, returnedOn, {
    finePerDayCents,
  });
}

describe('US-04 Izračun zamudnine (FineCalculator)', () => {
  it('AC2: vračilo pred rokom je brez zamude in zamudnine 0,00 €', () => {
    expect(fine('2026-11-02', '2026-10-20')).toEqual({
      overdueDays: 0,
      fineCents: 0,
    });
  });

  it('AC2: vračilo na dan roka je brez zamudnine', () => {
    expect(fine('2026-11-02', '2026-11-02')).toEqual({
      overdueDays: 0,
      fineCents: 0,
    });
  });

  it('AC2: vračilo dan po roku je 1 dan zamude in 0,10 €', () => {
    expect(fine('2026-11-02', '2026-11-03')).toEqual({
      overdueDays: 1,
      fineCents: 10,
    });
  });

  it('AC2: vračilo 3 dni po roku je 0,30 €', () => {
    const { overdueDays, fineCents } = fine('2026-11-02', '2026-11-05');

    expect(overdueDays).toBe(3);
    expect(formatCents(fineCents)).toBe('0.30');
  });

  it('AC2: primer z W-05, rok 7. 10. in vračilo 12. 10. je 5 × 0,10 € = 0,50 €', () => {
    expect(fine('2026-10-07', '2026-10-12')).toEqual({
      overdueDays: 5,
      fineCents: 50,
    });
  });

  it('AC2: zamudnino na dan vzame iz nastavitev', () => {
    expect(fine('2026-11-02', '2026-11-05', 25).fineCents).toBe(75);
    expect(fine('2026-11-02', '2026-11-05', 0).fineCents).toBe(0);
  });

  it('šteje koledarske dni čez konec meseca in prestopni dan', () => {
    expect(fine('2026-10-30', '2026-11-02').overdueDays).toBe(3);
    expect(fine('2026-12-30', '2027-01-02').overdueDays).toBe(3);
    expect(fine('2028-02-28', '2028-03-01').overdueDays).toBe(2);
  });

  it('prehod na zimski čas (25. 10. 2026) ne spremeni števila dni', () => {
    expect(fine('2026-10-24', '2026-10-26')).toEqual({
      overdueDays: 2,
      fineCents: 20,
    });
  });

  it('prehod na poletni čas (29. 3. 2026) ne spremeni števila dni', () => {
    expect(fine('2026-03-28', '2026-03-30').overdueDays).toBe(2);
  });
});
