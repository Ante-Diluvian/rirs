import { loanDeadline } from './loan-deadline';

const TODAY = '2026-10-12';

describe('US-06 loanDeadline', () => {
  it('AC1: preostali dnevi so razlika med rokom in današnjim dnem', () => {
    expect(loanDeadline('2026-10-26', TODAY)).toEqual({
      daysLeft: 14,
      isOverdue: false,
      dueSoon: false,
    });
  });

  it('AC1: izposoja je zamujena šele dan po roku', () => {
    expect(loanDeadline(TODAY, TODAY).isOverdue).toBe(false);
    expect(loanDeadline('2026-10-11', TODAY)).toEqual({
      daysLeft: 0,
      isOverdue: true,
      dueSoon: false,
    });
  });

  it('AC2: "Rok kmalu poteče" velja za rok danes do čez 3 dni', () => {
    expect(loanDeadline(TODAY, TODAY)).toEqual({
      daysLeft: 0,
      isOverdue: false,
      dueSoon: true,
    });
    expect(loanDeadline('2026-10-15', TODAY)).toEqual({
      daysLeft: 3,
      isOverdue: false,
      dueSoon: true,
    });
    expect(loanDeadline('2026-10-16', TODAY).dueSoon).toBe(false);
  });

  it('AC2: računa v koledarskih dneh tudi čez prehod na zimski čas', () => {
    expect(loanDeadline('2026-10-26', '2026-10-24')).toEqual({
      daysLeft: 2,
      isOverdue: false,
      dueSoon: true,
    });
  });
});
