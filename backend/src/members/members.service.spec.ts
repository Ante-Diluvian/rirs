import { NotFoundException } from '@nestjs/common';
import { toDbDate } from '../common/dates';
import { FineCalculator } from '../fines/fine-calculator';
import { Member, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Settings, SettingsService } from '../settings/settings.service';
import { MEMBER_SEARCH_LIMIT, MembersService } from './members.service';

const TODAY = '2026-10-12';
const BOOK_ID = '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const member: Member = {
  id: '6c1f2a3b-4d5e-4f6a-8b7c-9d0e1f2a3b4c',
  firstName: 'Janez',
  lastName: 'Novak',
  email: 'janez.novak@example.com',
  passwordHash: 'zgoscenka',
  role: Role.READER,
  phone: null,
  city: null,
  joinedOn: toDbDate('2025-01-15'),
  isBlocked: false,
  createdAt: new Date('2025-01-15T10:00:00Z'),
};

const settings: Settings = {
  loanPeriodDays: 21,
  finePerDayCents: 10,
  maxActiveLoans: 5,
  fineLimitCents: 500,
  maxActiveReservations: 3,
  pickupDays: 3,
};

function setup({
  found = member,
  dueDates = [] as string[],
  returnedFine = null as string | null,
  finePerDayCents = settings.finePerDayCents,
} = {}) {
  const prisma = {
    member: {
      findMany: jest.fn().mockResolvedValue([member]),
      findUnique: jest.fn().mockResolvedValue(found),
    },
    loan: {
      findMany: jest.fn().mockResolvedValue(
        dueDates.map((d) => ({
          dueDate: toDbDate(d),
          copy: { bookId: BOOK_ID },
        })),
      ),
      aggregate: jest.fn().mockResolvedValue({
        _sum: {
          fineAmount: returnedFine && new Prisma.Decimal(returnedFine),
        },
      }),
    },
  };
  const settingsService = {
    get: jest.fn().mockResolvedValue({ ...settings, finePerDayCents }),
  } as unknown as SettingsService;
  const clock = { today: () => TODAY };
  const service = new MembersService(
    prisma as unknown as PrismaService,
    settingsService,
    clock,
    new FineCalculator(),
  );
  return { service, prisma };
}

describe('MembersService', () => {
  describe('search', () => {
    it('vsako besedo išče v imenu, priimku ali e-pošti in vrne največ 20 članov', async () => {
      const { service, prisma } = setup();

      await expect(service.search('janez  novak')).resolves.toEqual([
        {
          id: member.id,
          firstName: 'Janez',
          lastName: 'Novak',
          email: 'janez.novak@example.com',
          role: Role.READER,
        },
      ]);

      const field = (word: string) => [
        { firstName: { contains: word, mode: 'insensitive' } },
        { lastName: { contains: word, mode: 'insensitive' } },
        { email: { contains: word, mode: 'insensitive' } },
      ];
      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { AND: [{ OR: field('janez') }, { OR: field('novak') }] },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
        take: MEMBER_SEARCH_LIMIT,
      });
    });
  });

  describe('summary', () => {
    it('član brez izposoj ima 0 izposoj in zamudnino 0.00', async () => {
      const { service } = setup();

      await expect(service.summary(member.id)).resolves.toEqual({
        id: member.id,
        firstName: 'Janez',
        lastName: 'Novak',
        email: 'janez.novak@example.com',
        role: Role.READER,
        activeLoans: 0,
        maxActiveLoans: 5,
        unpaidFine: '0.00',
        isBlocked: false,
      });
    });

    it('izposoja z rokom danes ali v prihodnosti nima zamudnine', async () => {
      const { service } = setup({ dueDates: ['2026-10-12', '2026-11-02'] });

      await expect(service.summary(member.id)).resolves.toMatchObject({
        activeLoans: 2,
        unpaidFine: '0.00',
      });
    });

    it('sprotna zamudnina je dni zamude krat zamudnina na dan', async () => {
      // 5 dni (rok 7. 10.) in 1 dan (rok 11. 10.)
      const { service } = setup({ dueDates: ['2026-10-07', '2026-10-11'] });

      await expect(service.summary(member.id)).resolves.toMatchObject({
        activeLoans: 2,
        unpaidFine: '0.60',
      });
    });

    it('zamudnino na dan vzame iz nastavitev', async () => {
      const { service } = setup({
        dueDates: ['2026-10-10'],
        finePerDayCents: 25,
      });

      await expect(service.summary(member.id)).resolves.toMatchObject({
        unpaidFine: '0.50',
      });
    });

    it('sprotni zamudnini prišteje neplačane zamudnine vrnjenih izposoj', async () => {
      const { service, prisma } = setup({
        dueDates: ['2026-09-27'],
        returnedFine: '4.30',
      });

      // 15 dni × 0,10 € + 4,30 €
      await expect(service.summary(member.id)).resolves.toMatchObject({
        unpaidFine: '5.80',
      });
      expect(prisma.loan.aggregate).toHaveBeenCalledWith({
        where: {
          memberId: member.id,
          status: 'RETURNED',
          finePaid: false,
          fineWaived: false,
        },
        _sum: { fineAmount: true },
      });
    });

    it('vrne stanje računa in mejo izposoj', async () => {
      const { service } = setup({ found: { ...member, isBlocked: true } });

      await expect(service.summary(member.id)).resolves.toMatchObject({
        maxActiveLoans: 5,
        isBlocked: true,
      });
    });

    it('za neobstoječega člana vrže 404 »Član ne obstaja.«', async () => {
      const { service, prisma } = setup({ found: null as unknown as Member });

      await expect(service.summary(member.id)).rejects.toThrow(
        new NotFoundException('Član ne obstaja.'),
      );
      expect(prisma.loan.findMany).not.toHaveBeenCalled();
    });
  });

  describe('account', () => {
    it('vrne naslove in roke aktivnih izposoj ter zamudnino v centih', async () => {
      const { service, prisma } = setup({
        dueDates: ['2026-10-07'],
        returnedFine: '0.30',
      });

      await expect(service.account(member.id)).resolves.toEqual({
        activeLoans: [{ bookId: BOOK_ID, dueDate: '2026-10-07' }],
        unpaidFineCents: 80,
      });
      expect(prisma.loan.findMany).toHaveBeenCalledWith({
        where: { memberId: member.id, status: { not: 'RETURNED' } },
        select: { dueDate: true, copy: { select: { bookId: true } } },
      });
    });
  });
});
