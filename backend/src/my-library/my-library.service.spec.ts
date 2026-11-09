import { toDbDate } from '../common/dates';
import { FineCalculator } from '../fines/fine-calculator';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationQueueService } from '../reservations/reservation-queue.service';
import { Settings, SettingsService } from '../settings/settings.service';
import { MyLibraryService } from './my-library.service';

const TODAY = '2026-10-12';
const MEMBER_ID = '6c1f2a3b-4d5e-4f6a-8b7c-9d0e1f2a3b4c';

const settings: Settings = {
  loanPeriodDays: 21,
  finePerDayCents: 10,
  maxActiveLoans: 5,
  fineLimitCents: 500,
  maxActiveReservations: 3,
  pickupDays: 3,
};

const book = {
  id: '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  title: 'Alamut',
  authors: [
    {
      author: {
        id: '8e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b',
        firstName: 'Vladimir',
        lastName: 'Bartol',
      },
    },
  ],
};

function setup({
  dueDates = [] as string[],
  unpaidFineCents = 0,
  activeReservations = 0,
  finePerDayCents = settings.finePerDayCents,
} = {}) {
  const prisma = {
    loan: {
      findMany: jest.fn().mockResolvedValue(
        dueDates.map((dueDate, i) => ({
          id: `loan-${i}`,
          loanedOn: toDbDate('2026-09-16'),
          dueDate: toDbDate(dueDate),
          copy: { book },
        })),
      ),
    },
    reservation: {
      count: jest.fn().mockResolvedValue(activeReservations),
    },
  };
  const members = {
    account: jest.fn().mockResolvedValue({
      activeLoans: dueDates.map((dueDate) => ({ bookId: book.id, dueDate })),
      unpaidFineCents,
    }),
  };
  const service = new MyLibraryService(
    prisma as unknown as PrismaService,
    {
      get: jest.fn().mockResolvedValue({ ...settings, finePerDayCents }),
    } as unknown as SettingsService,
    { today: () => TODAY },
    new FineCalculator(),
    members as unknown as MembersService,
    {} as ReservationQueueService,
  );
  return { service, prisma, members };
}

describe('US-06 MyLibraryService', () => {
  describe('loans', () => {
    it('AC1: vrne naslov, avtorje, datum izposoje, rok in preostale dni', async () => {
      const { service, prisma } = setup({ dueDates: ['2026-10-26'] });

      await expect(service.loans(MEMBER_ID)).resolves.toEqual([
        {
          id: 'loan-0',
          book: {
            id: book.id,
            title: 'Alamut',
            authors: [book.authors[0].author],
          },
          loanedOn: '2026-09-16',
          dueDate: '2026-10-26',
          daysLeft: 14,
          isOverdue: false,
          overdueDays: 0,
          fine: '0.00',
          dueSoon: false,
        },
      ]);
      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: MEMBER_ID, status: { not: 'RETURNED' } },
          orderBy: [{ dueDate: 'asc' }, { loanedOn: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('AC1: zamujena izposoja ima dni zamude in sprotno zamudnino iz nastavitev', async () => {
      const { service } = setup({
        dueDates: ['2026-10-07'],
        finePerDayCents: 25,
      });

      await expect(service.loans(MEMBER_ID)).resolves.toMatchObject([
        { isOverdue: true, overdueDays: 5, fine: '1.25', daysLeft: 0 },
      ]);
    });
  });

  describe('summary', () => {
    it('AC4: vrne števila z mejami, neplačano zamudnino in mejo iz nastavitev', async () => {
      const { service, members } = setup({
        dueDates: ['2026-10-07', '2026-10-26'],
        unpaidFineCents: 50,
        activeReservations: 2,
      });

      await expect(service.summary(MEMBER_ID)).resolves.toEqual({
        today: TODAY,
        activeLoans: 2,
        maxActiveLoans: 5,
        activeReservations: 2,
        maxActiveReservations: 3,
        unpaidFine: '0.50',
        fineLimit: '5.00',
        borrowingBlocked: false,
      });
      expect(members.account).toHaveBeenCalledWith(MEMBER_ID);
    });

    it('AC4: izposoja je onemogočena šele, ko je zamudnina nad mejo', async () => {
      for (const [unpaidFineCents, blocked] of [
        [500, false],
        [501, true],
      ] as const) {
        const { service } = setup({ unpaidFineCents });
        await expect(service.summary(MEMBER_ID)).resolves.toMatchObject({
          borrowingBlocked: blocked,
        });
      }
    });
  });
});
