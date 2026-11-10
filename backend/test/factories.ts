import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { DEFAULT_SETTINGS } from '../prisma/seed-data';
import { addDays, toDbDate } from '../src/common/dates';
import {
  LoanStatus,
  Prisma,
  PrismaClient,
  Role,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';

export const TEST_PASSWORD = 'geslo1234';

// ClockService v testih vrne ta datum, enako kot na wireframe-ih
export const TODAY = '2026-10-12';

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`
    SELECT current_database() AS name`;
  if (!name.endsWith('_test')) {
    throw new Error(`Baza "${name}" ni testna baza.`);
  }
  await prisma.$executeRaw`
    TRUNCATE librarium.loan, librarium.reservation, librarium.book_author, librarium.copy,
      librarium.book, librarium.author, librarium.member, librarium.setting CASCADE`;
}

export function createMember(
  prisma: PrismaClient,
  data: Partial<Prisma.MemberCreateInput> = {},
) {
  return prisma.member.create({
    data: {
      firstName: 'Maja',
      lastName: 'Kovač',
      email: `${randomUUID()}@example.test`,
      passwordHash: 'ni-zgosceno-geslo',
      ...data,
    },
  });
}

// nizek faktor bcrypt samo za hitrejše teste, compare deluje enako
export async function createUser(
  prisma: PrismaClient,
  role: Role,
  data: Partial<Prisma.MemberCreateInput> = {},
) {
  return createMember(prisma, {
    role,
    passwordHash: await bcrypt.hash(TEST_PASSWORD, 4),
    ...data,
  });
}

// privzeta pravila s spremembami testa, predpomnilnik se osveži
export async function setSettings(
  app: INestApplication,
  overrides: Record<string, string> = {},
): Promise<void> {
  const prisma = app.get(PrismaService);
  for (const [key, value] of Object.entries({
    ...DEFAULT_SETTINGS,
    ...overrides,
  })) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  await app.get(SettingsService).reload();
}

export async function login(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

export async function createBookWithCopies(prisma: PrismaClient, copies = 1) {
  const author = await prisma.author.create({
    data: { firstName: 'George', lastName: 'Orwell' },
  });

  return prisma.book.create({
    data: {
      title: '1984',
      isbn: `978${randomInt(1e9).toString().padStart(10, '0')}`,
      genre: 'znanstvena fantastika',
      authors: { create: { authorId: author.id } },
      copies: {
        create: Array.from({ length: copies }, () => ({
          inventoryNumber: `INV-${randomUUID().slice(0, 8)}`,
        })),
      },
    },
    include: { authors: true, copies: true },
  });
}

// privzeti rok je pomemben samo za teste rokov in zamudnin
export function createLoan(
  prisma: PrismaClient,
  data: {
    memberId: string;
    librarianId: string;
    copyId: string;
    status: LoanStatus;
    dueDate?: string;
    fineAmount?: string;
    finePaid?: boolean;
    fineWaived?: boolean;
  },
) {
  const { dueDate = '2026-09-22', ...rest } = data;
  return prisma.loan.create({
    data: {
      ...rest,
      loanedOn: toDbDate(addDays(dueDate, -21)),
      dueDate: toDbDate(dueDate),
      returnedOn:
        data.status === LoanStatus.RETURNED ? toDbDate('2026-09-20') : null,
    },
  });
}
