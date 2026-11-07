import { Logger } from '@nestjs/common';
import { DEFAULT_SETTINGS } from '../../prisma/seed-data';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

function rows(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => ({ key, value }));
}

function setup(...results: Record<string, string>[]) {
  const findMany = jest.fn();
  for (const values of results) findMany.mockResolvedValueOnce(rows(values));
  const prisma = { setting: { findMany } } as unknown as PrismaService;
  return { service: new SettingsService(prisma), findMany };
}

describe('SettingsService', () => {
  it('privzete nastavitve iz seeda vrne kot cela števila in zneske v centih', async () => {
    const { service } = setup(DEFAULT_SETTINGS);

    await expect(service.get()).resolves.toEqual({
      loanPeriodDays: 21,
      finePerDayCents: 10,
      maxActiveLoans: 5,
      fineLimitCents: 500,
      maxActiveReservations: 3,
      pickupDays: 3,
    });
  });

  it('vrednosti prebere enkrat in jih nato vrača iz predpomnilnika', async () => {
    const { service, findMany } = setup(DEFAULT_SETTINGS);

    await service.get();
    await service.get();

    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('reload prebere spremenjene vrednosti', async () => {
    const { service } = setup(DEFAULT_SETTINGS, {
      ...DEFAULT_SETTINGS,
      loan_period_days: '30',
      fine_limit: '7.5',
    });

    await service.get();
    await service.reload();

    await expect(service.get()).resolves.toMatchObject({
      loanPeriodDays: 30,
      fineLimitCents: 750,
    });
  });

  it('dovoli zamudnino in mejo zamudnine 0', async () => {
    const { service } = setup({
      ...DEFAULT_SETTINGS,
      fine_per_day: '0',
      fine_limit: '0.00',
    });

    await expect(service.get()).resolves.toMatchObject({
      finePerDayCents: 0,
      fineLimitCents: 0,
    });
  });

  it('manjkajoč ključ konča z napako, ki ga navede', async () => {
    const missing = { ...DEFAULT_SETTINGS };
    delete missing.loan_period_days;
    const { service } = setup(missing);

    await expect(service.get()).rejects.toThrow(
      'Nastavitve pravil v tabeli setting niso veljavne: loan_period_days manjka. ' +
        'Manjkajoče privzete vrednosti zapiše seed (npm run db:seed).',
    );
  });

  it('neveljavne vrednosti navede vse hkrati', async () => {
    const { service } = setup({
      ...DEFAULT_SETTINGS,
      loan_period_days: '2.5',
      fine_per_day: '-0.10',
      max_active_loans: '0',
      fine_limit: '5,00',
      max_active_reservations: 'tri',
      pickup_days: '',
    });

    // seed neveljavnih vrednosti ne popravi, zato namiga zanj ni
    await expect(service.get()).rejects.toThrow(
      new Error(
        'Nastavitve pravil v tabeli setting niso veljavne: ' +
          [
            'loan_period_days = »2.5« ni pozitivno celo število',
            'fine_per_day = »-0.10« ni znesek ≥ 0 z največ dvema decimalkama, npr. 0.10',
            'max_active_loans = »0« ni pozitivno celo število',
            'fine_limit = »5,00« ni znesek ≥ 0 z največ dvema decimalkama, npr. 0.10',
            'max_active_reservations = »tri« ni pozitivno celo število',
            'pickup_days = »« ni pozitivno celo število',
          ].join('; ') +
          '.',
      ),
    );
  });

  it('po napaki ne predpomni ničesar in ob naslednjem klicu bere znova', async () => {
    const { service, findMany } = setup({}, DEFAULT_SETTINGS);

    await expect(service.get()).rejects.toThrow('loan_period_days manjka');
    await expect(service.get()).resolves.toMatchObject({ loanPeriodDays: 21 });
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('check ob zagonu napako samo izpiše', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { service } = setup({});

    await expect(service.check()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('loan_period_days manjka; fine_per_day manjka'),
    );
    error.mockRestore();
  });
});
