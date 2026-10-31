import { ConflictException, NotFoundException } from '@nestjs/common';
import { Copy, CopyStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CopiesService } from './copies.service';

const COPY_ID = '7c2e1a9b-3f4d-4e5a-8b6c-1d2e3f4a5b6c';

const copy: Copy = {
  id: COPY_ID,
  bookId: '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  inventoryNumber: 'INV-000412',
  status: CopyStatus.AVAILABLE,
  purchasedOn: null,
  shelf: null,
};

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`napaka ${code}`, {
    code,
    clientVersion: '7',
  });
}

describe('CopiesService', () => {
  let tx: {
    $queryRaw: jest.Mock;
    copy: { update: jest.Mock; delete: jest.Mock };
    loan: { count: jest.Mock };
  };
  let prisma: { copy: { create: jest.Mock }; $transaction: jest.Mock };
  let service: CopiesService;

  const lockedAs = (status: CopyStatus | null) =>
    tx.$queryRaw.mockResolvedValue(status ? [{ status }] : []);

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      copy: {
        update: jest.fn().mockResolvedValue(copy),
        delete: jest.fn().mockResolvedValue(copy),
      },
      loan: { count: jest.fn().mockResolvedValue(0) },
    };
    prisma = {
      copy: { create: jest.fn().mockResolvedValue(copy) },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    service = new CopiesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('US-07 AC2: nov izvod dobi stanje AVAILABLE', async () => {
      await service.create(copy.bookId, { inventoryNumber: 'INV-000412' });

      expect(prisma.copy.create).toHaveBeenCalledWith({
        data: {
          bookId: copy.bookId,
          inventoryNumber: 'INV-000412',
          shelf: null,
          status: CopyStatus.AVAILABLE,
        },
      });
    });

    it('US-07 AC2: podvojena inventarna številka vrne 409', async () => {
      prisma.copy.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create(copy.bookId, { inventoryNumber: 'INV-000412' }),
      ).rejects.toThrow(
        new ConflictException('Izvod s to inventarno številko že obstaja.'),
      );
    });

    it('neobstoječa knjiga vrne 404', async () => {
      prisma.copy.create.mockRejectedValue(prismaError('P2003'));

      await expect(
        service.create(copy.bookId, { inventoryNumber: 'INV-000412' }),
      ).rejects.toThrow(new NotFoundException('Knjiga ne obstaja.'));
    });
  });

  describe('update', () => {
    it.each([CopyStatus.ON_LOAN, CopyStatus.RESERVED])(
      'izvodu s stanjem %s ne spremeni stanja',
      async (status) => {
        lockedAs(status);

        for (const next of [CopyStatus.AVAILABLE, CopyStatus.LOST] as const) {
          await expect(
            service.update(COPY_ID, { status: next }),
          ).rejects.toThrow(
            new ConflictException(
              'Izposojenemu ali rezerviranemu izvodu ni mogoče ročno spremeniti stanja.',
            ),
          );
        }
        expect(tx.copy.update).not.toHaveBeenCalled();
      },
    );

    it('izposojenemu izvodu lahko spremeni polico', async () => {
      lockedAs(CopyStatus.ON_LOAN);

      await service.update(COPY_ID, { shelf: 'B-3' });

      expect(tx.copy.update).toHaveBeenCalledWith({
        where: { id: COPY_ID },
        data: { shelf: 'B-3', status: undefined },
      });
    });

    it('izgubljen izvod lahko spet označi kot prost', async () => {
      lockedAs(CopyStatus.LOST);

      await service.update(COPY_ID, { status: CopyStatus.AVAILABLE });

      expect(tx.copy.update).toHaveBeenCalledWith({
        where: { id: COPY_ID },
        data: { shelf: undefined, status: CopyStatus.AVAILABLE },
      });
    });

    it('neobstoječ izvod vrne 404', async () => {
      lockedAs(null);

      await expect(service.update(COPY_ID, { shelf: 'B-3' })).rejects.toThrow(
        new NotFoundException('Izvod ne obstaja.'),
      );
    });
  });

  describe('remove', () => {
    it('US-07 AC3: izvod z zgodovino izposoj zavrne in predlaga Izgubljen', async () => {
      lockedAs(CopyStatus.AVAILABLE);
      tx.loan.count.mockResolvedValue(1);

      await expect(service.remove(COPY_ID)).rejects.toThrow(
        new ConflictException(
          'Izvoda z zgodovino izposoj ni mogoče izbrisati. Označi ga kot izgubljenega.',
        ),
      );
      expect(tx.copy.delete).not.toHaveBeenCalled();
    });

    it('rezerviranega izvoda ne izbriše', async () => {
      lockedAs(CopyStatus.RESERVED);

      await expect(service.remove(COPY_ID)).rejects.toThrow(
        new ConflictException('Rezerviranega izvoda ni mogoče izbrisati.'),
      );
    });

    it('izvod brez zgodovine izbriše', async () => {
      lockedAs(CopyStatus.LOST);

      await service.remove(COPY_ID);

      expect(tx.copy.delete).toHaveBeenCalledWith({ where: { id: COPY_ID } });
    });
  });
});
