import { ReservationContext, ReservationPolicy } from './reservation-policy';

const allowed: ReservationContext = {
  isBlocked: false,
  availableCopies: 0,
  activeReservations: 0,
  hasSameTitleReservation: false,
  hasSameTitleLoan: false,
};

describe('US-05 ReservationPolicy', () => {
  const policy = new ReservationPolicy();
  const violation = (
    context: Partial<ReservationContext>,
    maxActiveReservations = 3,
  ) => policy.violation({ ...allowed, ...context }, { maxActiveReservations });

  it('rezervacijo dovoli, ko so vsa pravila izpolnjena', () => {
    expect(violation({})).toBeNull();
  });

  it('blokiran član ne more rezervirati', () => {
    expect(violation({ isBlocked: true })).toBe(
      'Tvoj račun je blokiran. Obrni se na knjižnico.',
    );
  });

  it('AC1: naslova s prostim izvodom ni mogoče rezervirati', () => {
    expect(violation({ availableCopies: 1 })).toBe(
      'Naslov ima prost izvod, zato ga ni mogoče rezervirati.',
    );
  });

  it('AC3: zavrne četrto aktivno rezervacijo z "Imaš že 3 aktivne rezervacije"', () => {
    expect(violation({ activeReservations: 2 })).toBeNull();
    expect(violation({ activeReservations: 3 })).toBe(
      'Imaš že 3 aktivne rezervacije',
    );
  });

  it('AC3: meja in oblika besedila sledita nastavitvi max_active_reservations', () => {
    expect(violation({ activeReservations: 1 }, 1)).toBe(
      'Imaš že 1 aktivno rezervacijo',
    );
    expect(violation({ activeReservations: 2 }, 2)).toBe(
      'Imaš že 2 aktivni rezervaciji',
    );
    expect(violation({ activeReservations: 4 }, 4)).toBe(
      'Imaš že 4 aktivne rezervacije',
    );
    expect(violation({ activeReservations: 5 }, 5)).toBe(
      'Imaš že 5 aktivnih rezervacij',
    );
    expect(violation({ activeReservations: 4 }, 5)).toBeNull();
  });

  it('AC4: istega naslova ni mogoče rezervirati dvakrat', () => {
    expect(violation({ hasSameTitleReservation: true })).toBe(
      'Ta naslov že imaš rezerviran.',
    );
  });

  it('AC4: naslova, ki ga ima bralec izposojenega, ni mogoče rezervirati', () => {
    expect(violation({ hasSameTitleLoan: true })).toBe(
      'Ta naslov že imaš izposojen.',
    );
  });

  it('vrne razlog prvega neizpolnjenega pravila v vrstnem redu iz pravil', () => {
    const all: Partial<ReservationContext> = {
      isBlocked: true,
      availableCopies: 1,
      activeReservations: 3,
      hasSameTitleReservation: true,
      hasSameTitleLoan: true,
    };
    expect(violation(all)).toMatch(/blokiran/);
    expect(violation({ ...all, isBlocked: false })).toMatch(/prost izvod/);
    expect(violation({ ...all, isBlocked: false, availableCopies: 0 })).toBe(
      'Imaš že 3 aktivne rezervacije',
    );
    expect(
      violation({
        ...all,
        isBlocked: false,
        availableCopies: 0,
        activeReservations: 2,
      }),
    ).toBe('Ta naslov že imaš rezerviran.');
  });
});
