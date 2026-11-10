import { CopyStatus } from '../generated/prisma/client';
import { Settings } from '../settings/settings.service';
import { LoanContext, LoanPolicy, LoanRule } from './loan-policy';

const settings: Settings = {
  loanPeriodDays: 21,
  finePerDayCents: 10,
  maxActiveLoans: 5,
  fineLimitCents: 500,
  maxActiveReservations: 3,
  pickupDays: 3,
};

const context: LoanContext = {
  isBlocked: false,
  activeLoans: 0,
  unpaidFineCents: 0,
  copy: { inventoryNumber: 'INV-002301', status: CopyStatus.AVAILABLE },
  copyReservedForMember: false,
  hasSameTitle: false,
};

const policy = new LoanPolicy();

function check(
  rule: LoanRule,
  changes: Partial<LoanContext>,
  overrides: Partial<Settings> = {},
) {
  return policy
    .check({ ...context, ...changes }, { ...settings, ...overrides })
    .find((c) => c.rule === rule);
}

describe('LoanPolicy', () => {
  it('vrne vseh pet preverjanj v vrstnem redu z oznakami z W-05', () => {
    expect(policy.check(context, settings)).toEqual([
      {
        rule: LoanRule.MEMBER_NOT_BLOCKED,
        passed: true,
        message: 'Član ni blokiran',
      },
      {
        rule: LoanRule.MAX_ACTIVE_LOANS,
        passed: true,
        message: 'Manj kot 5 aktivnih izposoj',
      },
      {
        rule: LoanRule.FINE_LIMIT,
        passed: true,
        message: 'Zamudnina do 5,00 €',
      },
      {
        rule: LoanRule.COPY_AVAILABLE,
        passed: true,
        message: 'Izvod je prost',
      },
      {
        rule: LoanRule.SAME_TITLE,
        passed: true,
        message: 'Član nima izposojenega istega naslova',
      },
    ]);
  });

  it('blokiran član ne izpolni prvega pravila', () => {
    expect(check(LoanRule.MEMBER_NOT_BLOCKED, { isBlocked: true })).toEqual({
      rule: LoanRule.MEMBER_NOT_BLOCKED,
      passed: false,
      message: 'Član je blokiran.',
    });
  });

  it('dovoli 4 aktivne izposoje in zavrne 5 pri meji 5', () => {
    expect(check(LoanRule.MAX_ACTIVE_LOANS, { activeLoans: 4 })?.passed).toBe(
      true,
    );
    expect(check(LoanRule.MAX_ACTIVE_LOANS, { activeLoans: 5 })).toEqual({
      rule: LoanRule.MAX_ACTIVE_LOANS,
      passed: false,
      message: 'Član ima 5 aktivnih izposoj, kar je največ dovoljeno.',
    });
  });

  it('mejo izposoj vzame iz nastavitev in jo izpiše v pravi množini', () => {
    const message = (max: number, activeLoans: number) =>
      check(LoanRule.MAX_ACTIVE_LOANS, { activeLoans }, { maxActiveLoans: max })
        ?.message;

    expect(message(1, 1)).toBe(
      'Član ima 1 aktivno izposojo, kar je največ dovoljeno.',
    );
    expect(message(2, 2)).toBe(
      'Član ima 2 aktivni izposoji, kar je največ dovoljeno.',
    );
    expect(message(3, 3)).toBe(
      'Član ima 3 aktivne izposoje, kar je največ dovoljeno.',
    );
    expect(message(3, 2)).toBe('Manj kot 3 aktivne izposoje');
    expect(message(2, 1)).toBe('Manj kot 2 aktivni izposoji');
  });

  it('dovoli zamudnino 5,00 € in zavrne 5,01 € pri meji 5,00 €', () => {
    expect(check(LoanRule.FINE_LIMIT, { unpaidFineCents: 500 })).toEqual({
      rule: LoanRule.FINE_LIMIT,
      passed: true,
      message: 'Zamudnina do 5,00 €',
    });
    expect(check(LoanRule.FINE_LIMIT, { unpaidFineCents: 501 })).toEqual({
      rule: LoanRule.FINE_LIMIT,
      passed: false,
      message: 'Član ima neplačano zamudnino 5,01 €, kar presega mejo 5,00 €.',
    });
  });

  it('mejo zamudnine vzame iz nastavitev', () => {
    expect(
      check(
        LoanRule.FINE_LIMIT,
        { unpaidFineCents: 251 },
        { fineLimitCents: 250 },
      )?.message,
    ).toBe('Član ima neplačano zamudnino 2,51 €, kar presega mejo 2,50 €.');
  });

  it('izvod mora biti prost ali rezerviran za tega člana', () => {
    const copy = (status: CopyStatus, copyReservedForMember = false) =>
      check(LoanRule.COPY_AVAILABLE, {
        copy: { inventoryNumber: 'INV-002301', status },
        copyReservedForMember,
      });

    expect(copy(CopyStatus.RESERVED, true)).toMatchObject({
      passed: true,
      message: 'Izvod je rezerviran za tega člana',
    });
    expect(copy(CopyStatus.RESERVED)).toMatchObject({
      passed: false,
      message: 'Izvod INV-002301 je rezerviran za drugega člana.',
    });
    expect(copy(CopyStatus.ON_LOAN)).toMatchObject({
      passed: false,
      message: 'Izvod INV-002301 je že izposojen.',
    });
    expect(copy(CopyStatus.LOST)).toMatchObject({
      passed: false,
      message: 'Izvod INV-002301 je označen kot izgubljen.',
    });
  });

  it('član ne sme imeti izposojenega istega naslova', () => {
    expect(check(LoanRule.SAME_TITLE, { hasSameTitle: true })).toEqual({
      rule: LoanRule.SAME_TITLE,
      passed: false,
      message: 'Član ima ta naslov že izposojen.',
    });
  });

  it('pri več neizpolnjenih pravilih so vsa označena, prvo je blokada', () => {
    const failed = policy
      .check(
        {
          ...context,
          isBlocked: true,
          activeLoans: 5,
          copy: { inventoryNumber: 'INV-1', status: CopyStatus.ON_LOAN },
        },
        settings,
      )
      .filter((c) => !c.passed)
      .map((c) => c.rule);

    expect(failed).toEqual([
      LoanRule.MEMBER_NOT_BLOCKED,
      LoanRule.MAX_ACTIVE_LOANS,
      LoanRule.COPY_AVAILABLE,
    ]);
  });
});
