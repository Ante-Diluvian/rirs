import { existsSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import {
  addDays,
  diffDays,
  toDbDate,
  todayInLjubljana,
} from '../src/common/dates';
import {
  CopyStatus,
  LoanStatus,
  Member,
  PrismaClient,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter';
import {
  BOOKS,
  DEFAULT_SETTINGS,
  LIBRARIAN,
  LOANS,
  READERS,
  RESERVATIONS,
  ReaderKey,
  SeedBook,
  SeedPerson,
} from './seed-data';

const BCRYPT_ROUNDS = 12;
const DAY_MS = 86_400_000;

export interface SeedEnv {
  adminEmail: string;
  adminPassword: string;
  demoPassword: string;
}

export interface SeedSummary {
  members: number;
  books: number;
  copies: number;
  loans: number;
  reservations: number;
  settings: number;
}

type Catalog = Map<string, { bookId: string; copyIds: string[] }>;

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value?.trim()) {
    throw new Error(
      `Manjka ${name}. Nastavi jo v .env v korenu repozitorija (primer je v .env.example).`,
    );
  }
  return value;
}

function requirePassword(env: NodeJS.ProcessEnv, name: string): string {
  const value = requireEnv(env, name);
  if (value.length < 8 || Buffer.byteLength(value) > 72) {
    throw new Error(`${name} mora imeti vsaj 8 znakov in največ 72 bajtov.`);
  }
  return value;
}

export function readSeedEnv(env: NodeJS.ProcessEnv = process.env): SeedEnv {
  return {
    adminEmail: requireEnv(env, 'ADMIN_EMAIL').trim().toLowerCase(),
    adminPassword: requirePassword(env, 'ADMIN_PASSWORD'),
    demoPassword: requirePassword(env, 'DEMO_PASSWORD'),
  };
}

// izmišljen ISBN-13 (978-961-…) z veljavno kontrolno števko
export function demoIsbn(index: number): string {
  const digits = `978961${String(index + 1).padStart(6, '0')}`;
  const sum = [...digits].reduce(
    (acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return `${digits}${(10 - (sum % 10)) % 10}`;
}

function inventoryNumbers(book: SeedBook, index: number): string[] {
  return (
    book.inventoryNumbers ??
    Array.from(
      { length: book.copies },
      (_, copy) =>
        `INV-1${String(index + 1).padStart(3, '0')}${String(copy + 1).padStart(2, '0')}`,
    )
  );
}

function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

async function setting(prisma: PrismaClient, key: string): Promise<string> {
  const row = await prisma.setting.findUniqueOrThrow({ where: { key } });
  return row.value;
}

function bookOf(catalog: Catalog, title: string) {
  const book = catalog.get(title);
  if (!book) throw new Error(`Knjige »${title}« ni v demo katalogu.`);
  return book;
}

// geslo se zgosti znova samo, če se ne ujema več s tistim iz .env
async function upsertMember(
  prisma: PrismaClient,
  person: SeedPerson,
  role: Role,
  password: string,
): Promise<Member> {
  const existing = await prisma.member.findUnique({
    where: { email: person.email },
  });
  if (existing && (await bcrypt.compare(password, existing.passwordHash))) {
    return prisma.member.update({ where: { id: existing.id }, data: { role } });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return prisma.member.upsert({
    where: { email: person.email },
    create: { ...person, role, passwordHash },
    update: { role, passwordHash },
  });
}

async function seedCatalog(prisma: PrismaClient): Promise<Catalog> {
  const catalog: Catalog = new Map();

  for (const [index, data] of BOOKS.entries()) {
    const book = await prisma.book.upsert({
      where: { isbn: demoIsbn(index) },
      create: {
        title: data.title,
        isbn: demoIsbn(index),
        publicationYear: data.year,
        genre: data.genre,
        language: data.language,
        description: data.description,
      },
      update: {},
    });

    for (const [firstName, lastName] of data.authors) {
      const author =
        (await prisma.author.findFirst({ where: { firstName, lastName } })) ??
        (await prisma.author.create({ data: { firstName, lastName } }));
      await prisma.bookAuthor.upsert({
        where: { bookId_authorId: { bookId: book.id, authorId: author.id } },
        create: { bookId: book.id, authorId: author.id },
        update: {},
      });
    }

    const copyIds: string[] = [];
    for (const inventoryNumber of inventoryNumbers(data, index)) {
      const copy = await prisma.copy.upsert({
        where: { inventoryNumber },
        create: { bookId: book.id, inventoryNumber },
        update: {},
      });
      copyIds.push(copy.id);
    }

    catalog.set(data.title, { bookId: book.id, copyIds });
  }

  return catalog;
}

async function seedLoans(
  prisma: PrismaClient,
  catalog: Catalog,
  readers: Record<ReaderKey, Member>,
  librarianId: string,
  today: string,
): Promise<void> {
  const loanPeriodDays = Number(await setting(prisma, 'loan_period_days'));
  const finePerDayCents = toCents(await setting(prisma, 'fine_per_day'));

  for (const loan of LOANS) {
    const copyId = bookOf(catalog, loan.title).copyIds[loan.copy];
    const memberId = readers[loan.reader].id;
    const loanedOn = addDays(today, -loan.loanedDaysAgo);
    const dueDate = addDays(loanedOn, loanPeriodDays);
    const data = {
      memberId,
      copyId,
      librarianId,
      loanedOn: toDbDate(loanedOn),
      dueDate: toDbDate(dueDate),
    };

    if (loan.returnedDaysAgo !== undefined) {
      const returnedOn = addDays(today, -loan.returnedDaysAgo);
      const exists = await prisma.loan.findFirst({
        where: { memberId, copyId, loanedOn: data.loanedOn },
      });
      if (exists) continue;

      const fineCents =
        Math.max(0, diffDays(returnedOn, dueDate)) * finePerDayCents;
      await prisma.loan.create({
        data: {
          ...data,
          returnedOn: toDbDate(returnedOn),
          status: LoanStatus.RETURNED,
          fineAmount: (fineCents / 100).toFixed(2),
        },
      });
      continue;
    }

    const copy = await prisma.copy.findUniqueOrThrow({ where: { id: copyId } });
    const open = await prisma.loan.findFirst({
      where: { copyId, status: { not: LoanStatus.RETURNED } },
    });
    if (open || copy.status !== CopyStatus.AVAILABLE) continue;

    await prisma.$transaction([
      prisma.loan.create({ data }),
      prisma.copy.update({
        where: { id: copyId },
        data: { status: CopyStatus.ON_LOAN },
      }),
    ]);
  }
}

async function seedReservations(
  prisma: PrismaClient,
  catalog: Catalog,
  readers: Record<ReaderKey, Member>,
  today: string,
  now: Date,
): Promise<void> {
  const pickupDays = Number(await setting(prisma, 'pickup_days'));

  for (const reservation of RESERVATIONS) {
    const { bookId } = bookOf(catalog, reservation.title);
    const memberId = readers[reservation.reader].id;
    const active = await prisma.reservation.findFirst({
      where: {
        memberId,
        bookId,
        status: { in: [ReservationStatus.WAITING, ReservationStatus.READY] },
      },
    });
    if (active) continue;

    const createdAt = new Date(
      now.getTime() - reservation.createdDaysAgo * DAY_MS,
    );
    const available = await prisma.copy.findFirst({
      where: { bookId, status: CopyStatus.AVAILABLE },
      orderBy: { inventoryNumber: 'asc' },
    });

    if (reservation.readyDaysAgo === undefined) {
      // rezervirati je mogoče samo naslov brez prostega izvoda
      if (!available) {
        await prisma.reservation.create({
          data: { memberId, bookId, createdAt },
        });
      }
      continue;
    }

    if (!available) continue;
    const readyOn = addDays(today, -reservation.readyDaysAgo);
    await prisma.$transaction([
      prisma.reservation.create({
        data: {
          memberId,
          bookId,
          createdAt,
          status: ReservationStatus.READY,
          copyId: available.id,
          readyUntil: toDbDate(addDays(readyOn, pickupDays)),
        },
      }),
      prisma.copy.update({
        where: { id: available.id },
        data: { status: CopyStatus.RESERVED },
      }),
    ]);
  }
}

export async function seed(
  prisma: PrismaClient,
  env: SeedEnv,
  today: string = todayInLjubljana(),
  now: Date = new Date(),
): Promise<SeedSummary> {
  await upsertMember(
    prisma,
    {
      firstName: 'Administrator',
      lastName: 'Librarium',
      email: env.adminEmail,
    },
    Role.ADMIN,
    env.adminPassword,
  );

  // obstoječih vrednosti ne prepišemo, ker jih lahko spremeni administrator
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }

  const librarian = await upsertMember(
    prisma,
    LIBRARIAN,
    Role.LIBRARIAN,
    env.demoPassword,
  );
  const readers = {} as Record<ReaderKey, Member>;
  for (const [key, person] of Object.entries(READERS)) {
    readers[key as ReaderKey] = await upsertMember(
      prisma,
      person,
      Role.READER,
      env.demoPassword,
    );
  }

  const catalog = await seedCatalog(prisma);
  await seedLoans(prisma, catalog, readers, librarian.id, today);
  await seedReservations(prisma, catalog, readers, today, now);

  return {
    members: await prisma.member.count(),
    books: await prisma.book.count(),
    copies: await prisma.copy.count(),
    loans: await prisma.loan.count(),
    reservations: await prisma.reservation.count(),
    settings: await prisma.setting.count(),
  };
}

async function main(): Promise<void> {
  for (const file of ['.env', '../.env']) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const env = readSeedEnv();
  const url = requireEnv(process.env, 'DATABASE_URL');

  const prisma = new PrismaClient({ adapter: createPrismaAdapter(url) });
  try {
    const s = await seed(prisma, env);
    console.log(
      `Seed končan: ${s.members} članov, ${s.books} knjig, ${s.copies} izvodov, ` +
        `${s.loans} izposoj, ${s.reservations} rezervacij, ${s.settings} nastavitev.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      `Seed ni uspel: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
