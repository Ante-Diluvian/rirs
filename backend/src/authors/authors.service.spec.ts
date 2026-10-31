import { ConflictException, NotFoundException } from '@nestjs/common';
import { Author, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AUTHOR_SEARCH_LIMIT, AuthorsService } from './authors.service';

const author: Author = {
  id: '0b6f4c1e-8a2d-4f3b-9c5e-7d1a2b3c4d5e',
  firstName: 'Vladimir',
  lastName: 'Bartol',
  birthDate: new Date('1903-02-24T00:00:00Z'),
  country: 'Slovenija',
  biography: null,
};

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`napaka ${code}`, {
    code,
    clientVersion: '7',
  });
}

describe('AuthorsService', () => {
  let prisma: {
    author: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: AuthorsService;

  beforeEach(() => {
    prisma = {
      author: {
        findMany: jest.fn().mockResolvedValue([author]),
        create: jest.fn().mockResolvedValue(author),
        update: jest.fn().mockResolvedValue(author),
        delete: jest.fn().mockResolvedValue(author),
      },
    };
    service = new AuthorsService(prisma as unknown as PrismaService);
  });

  describe('search', () => {
    it('vsaka beseda se mora ujemati z imenom ali priimkom', async () => {
      await service.search('  vladimir   BAR ');

      const [{ where, take }] = prisma.author.findMany.mock.calls[0] as [
        Prisma.AuthorFindManyArgs,
      ];
      expect(take).toBe(AUTHOR_SEARCH_LIMIT);
      expect(where).toEqual({
        AND: ['vladimir', 'BAR'].map((word) => ({
          OR: [
            { firstName: { contains: word, mode: 'insensitive' } },
            { lastName: { contains: word, mode: 'insensitive' } },
          ],
        })),
      });
    });

    it('brez niza vrne prvih 20 avtorjev brez filtra', async () => {
      await service.search();

      const [{ where }] = prisma.author.findMany.mock.calls[0] as [
        Prisma.AuthorFindManyArgs,
      ];
      expect(where).toEqual({ AND: [] });
    });

    it('vrne datum rojstva kot YYYY-MM-DD', async () => {
      await expect(service.search('bartol')).resolves.toEqual([
        {
          id: author.id,
          firstName: 'Vladimir',
          lastName: 'Bartol',
          birthDate: '1903-02-24',
          country: 'Slovenija',
          biography: null,
        },
      ]);
    });
  });

  describe('create in update', () => {
    it('izpuščena neobvezna polja shrani kot null', async () => {
      await service.create({ firstName: 'Ivan', lastName: 'Cankar' });

      expect(prisma.author.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Ivan',
          lastName: 'Cankar',
          birthDate: null,
          country: null,
          biography: null,
        },
      });
    });

    it('datum rojstva shrani kot polnoč UTC', async () => {
      await service.update(author.id, {
        firstName: 'Vladimir',
        lastName: 'Bartol',
        birthDate: '1903-02-24',
      });

      const [{ data }] = prisma.author.update.mock.calls[0] as [
        { data: { birthDate: Date } },
      ];
      expect(data.birthDate.toISOString()).toBe('1903-02-24T00:00:00.000Z');
    });

    it('update neobstoječega avtorja vrne 404', async () => {
      prisma.author.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(author.id, { firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(new NotFoundException('Avtor ne obstaja.'));
    });
  });

  describe('remove', () => {
    it('US-07 AC4: avtorja s knjigami zavrne z razlogom', async () => {
      prisma.author.delete.mockRejectedValue(prismaError('P2003'));

      await expect(service.remove(author.id)).rejects.toThrow(
        new ConflictException(
          'Avtorja, ki je naveden pri vsaj eni knjigi, ni mogoče izbrisati.',
        ),
      );
    });

    it('neobstoječ avtor vrne 404', async () => {
      prisma.author.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.remove(author.id)).rejects.toThrow(
        new NotFoundException('Avtor ne obstaja.'),
      );
    });

    it('druge napake posreduje naprej', async () => {
      const error = new Error('povezava prekinjena');
      prisma.author.delete.mockRejectedValue(error);

      await expect(service.remove(author.id)).rejects.toBe(error);
    });
  });
});
