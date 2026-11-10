import bcrypt from 'bcryptjs';
import { readSeedEnv, seed, SeedEnv, SeedSummary } from '../prisma/seed';
import { BOOKS, DEFAULT_SETTINGS } from '../prisma/seed-data';
import {
  CopyStatus,
  LoanStatus,
  PrismaClient,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter';
import { resetDatabase } from './factories';

const TODAY = '2026-10-12';
const NOW = new Date('2026-10-12T10:00:00Z');
const env: SeedEnv = {
  adminEmail: 'admin@librarium.test',
  adminPassword: 'admin-geslo-123',
  demoPassword: 'demo-geslo-123',
};

const day = (date: Date | null) => date?.toISOString().slice(0, 10);

jest.setTimeout(60_000);

describe('Začetni podatki (seed)', () => {
  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(process.env.DATABASE_URL ?? ''),
  });
  let summary: SeedSummary;

  beforeAll(async () => {
    await resetDatabase(prisma);
    summary = await seed(prisma, env, TODAY, NOW);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function memberByEmail(email: string) {
    return prisma.member.findUniqueOrThrow({ where: { email } });
  }

  it('ustvari administratorja, knjižničarko in bralce z gesli bcrypt (faktor 12)', async () => {
    const admin = await memberByEmail('admin@librarium.test');
    const librarian = await memberByEmail('ana.horvat@example.com');
    const maja = await memberByEmail('maja.kovac@example.com');

    expect(admin.role).toBe(Role.ADMIN);
    expect(librarian.role).toBe(Role.LIBRARIAN);
    expect(await prisma.member.count({ where: { role: Role.READER } })).toBe(6);
    expect(await bcrypt.compare(env.adminPassword, admin.passwordHash)).toBe(
      true,
    );
    expect(await bcrypt.compare(env.demoPassword, maja.passwordHash)).toBe(
      true,
    );
    expect(bcrypt.getRounds(maja.passwordHash)).toBe(12);
  });

  it('vpiše privzete nastavitve pravil', async () => {
    const settings = await prisma.setting.findMany();

    expect(Object.fromEntries(settings.map((s) => [s.key, s.value]))).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('ustvari okoli 50 knjig z avtorji, 1–3 izvodi in veljavnim ISBN', async () => {
    const books = await prisma.book.findMany({
      include: { authors: true, copies: true },
    });

    expect(books).toHaveLength(BOOKS.length);
    expect(books.length).toBeGreaterThanOrEqual(45);
    for (const book of books) {
      expect(book.authors.length).toBeGreaterThanOrEqual(1);
      expect(book.copies.length).toBeGreaterThanOrEqual(1);
      expect(book.copies.length).toBeLessThanOrEqual(3);
      const sum = [...book.isbn].reduce(
        (acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3),
        0,
      );
      expect(book.isbn).toMatch(/^\d{13}$/);
      expect(sum % 10).toBe(0);
    }
    expect(books.find((b) => b.title === 'Good Omens')?.authors).toHaveLength(
      2,
    );
  });

  it('Maja ima izposoje in rezervacije z wireframe-a W-04', async () => {
    const maja = await memberByEmail('maja.kovac@example.com');
    const loans = await prisma.loan.findMany({
      where: { memberId: maja.id, status: { not: LoanStatus.RETURNED } },
      include: { copy: { include: { book: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const reservations = await prisma.reservation.findMany({
      where: { memberId: maja.id },
      include: { book: true, copy: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(
      loans.map((l) => [l.copy.book.title, day(l.loanedOn), day(l.dueDate)]),
    ).toEqual([
      ['Alamut', '2026-09-16', '2026-10-07'],
      ['Dune', '2026-09-23', '2026-10-14'],
      ['Na klancu', '2026-10-05', '2026-10-26'],
    ]);
    expect(
      reservations.map((r) => [r.book.title, r.status, day(r.readyUntil)]),
    ).toEqual([
      ['Visoška kronika', ReservationStatus.READY, '2026-10-14'],
      ['1984', ReservationStatus.WAITING, undefined],
    ]);
    expect(reservations[0].copy?.status).toBe(CopyStatus.RESERVED);
  });

  it('čakalna vrsta za 1984 je Janez, Luka, Maja, za Alamut je prvi Luka', async () => {
    const queue = async (title: string) =>
      (
        await prisma.reservation.findMany({
          where: { book: { title }, status: ReservationStatus.WAITING },
          include: { member: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      ).map((r) => r.member.firstName);

    expect(await queue('1984')).toEqual(['Janez', 'Luka', 'Maja']);
    expect(await queue('Alamut')).toEqual(['Luka']);
  });

  it('Janez ima izvod INV-000412 z rokom 7. 10. 2026 (W-05)', async () => {
    const loan = await prisma.loan.findFirstOrThrow({
      where: {
        copy: { inventoryNumber: 'INV-000412' },
        status: { not: LoanStatus.RETURNED },
      },
      include: { member: true },
    });

    expect(loan.member.email).toBe('janez.novak@example.com');
    expect(day(loan.dueDate)).toBe('2026-10-07');
  });

  it('Nina ima 5 aktivnih izposoj, Petra neplačano zamudnino 6,20 €', async () => {
    const nina = await memberByEmail('nina.golob@example.com');
    const petra = await memberByEmail('petra.kralj@example.com');
    const petraLoans = await prisma.loan.findMany({
      where: { memberId: petra.id },
    });

    expect(
      await prisma.loan.count({
        where: { memberId: nina.id, status: { not: LoanStatus.RETURNED } },
      }),
    ).toBe(5);
    expect(petraLoans).toHaveLength(1);
    expect(petraLoans[0]).toMatchObject({
      status: LoanStatus.RETURNED,
      finePaid: false,
      fineWaived: false,
    });
    expect(petraLoans[0].fineAmount.toFixed(2)).toBe('6.20');
  });

  it('stanja izvodov se ujemajo z izposojami in rezervacijami', async () => {
    const openLoans = await prisma.loan.findMany({
      where: { status: { not: LoanStatus.RETURNED } },
    });
    const readyReservations = await prisma.reservation.findMany({
      where: { status: ReservationStatus.READY },
    });
    const copyIds = async (status: CopyStatus) =>
      (await prisma.copy.findMany({ where: { status } }))
        .map((c) => c.id)
        .sort();

    expect(await copyIds(CopyStatus.ON_LOAN)).toEqual(
      openLoans.map((l) => l.copyId).sort(),
    );
    expect(await copyIds(CopyStatus.RESERVED)).toEqual(
      readyReservations.map((r) => r.copyId).sort(),
    );
    expect(
      await prisma.copy.count({
        where: {
          status: CopyStatus.AVAILABLE,
          book: {
            reservations: { some: { status: ReservationStatus.WAITING } },
          },
        },
      }),
    ).toBe(0);
  });

  it('ponoven zagon ne podvoji podatkov in ne prepiše spremenjenih nastavitev', async () => {
    await prisma.setting.update({
      where: { key: 'loan_period_days' },
      data: { value: '30' },
    });

    const again = await seed(prisma, env, TODAY, NOW);

    expect(again).toEqual(summary);
    expect(
      (
        await prisma.setting.findUniqueOrThrow({
          where: { key: 'loan_period_days' },
        })
      ).value,
    ).toBe('30');
  });

  it('brez ADMIN_EMAIL, ADMIN_PASSWORD ali DEMO_PASSWORD konča z razumljivo napako', () => {
    const complete = {
      ADMIN_EMAIL: 'Admin@Librarium.test',
      ADMIN_PASSWORD: 'admin-geslo-123',
      DEMO_PASSWORD: 'demo-geslo-123',
    };

    expect(readSeedEnv(complete).adminEmail).toBe('admin@librarium.test');
    expect(() => readSeedEnv({ ...complete, ADMIN_EMAIL: '' })).toThrow(
      'Manjka ADMIN_EMAIL',
    );
    expect(() =>
      readSeedEnv({ ...complete, ADMIN_PASSWORD: undefined }),
    ).toThrow('Manjka ADMIN_PASSWORD');
    expect(() => readSeedEnv({ ...complete, DEMO_PASSWORD: '' })).toThrow(
      'Manjka DEMO_PASSWORD',
    );
    expect(() =>
      readSeedEnv({ ...complete, ADMIN_PASSWORD: 'kratko' }),
    ).toThrow('vsaj 8 znakov');
  });
});
