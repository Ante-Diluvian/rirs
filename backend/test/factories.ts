import { randomInt, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

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
