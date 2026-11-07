import { ConflictException } from '@nestjs/common';
import { ClockService } from '../common/clock.service';
import { Prisma } from '../generated/prisma/client';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationQueueService } from '../reservations/reservation-queue.service';
import { SettingsService } from '../settings/settings.service';
import { LoanPolicy } from './loan-policy';
import { LoansService } from './loans.service';

function setup(error: Error) {
  const prisma = {
    $transaction: jest.fn().mockRejectedValue(error),
  } as unknown as PrismaService;
  return new LoansService(
    prisma,
    {} as SettingsService,
    {} as ClockService,
    {} as MembersService,
    new LoanPolicy(),
    {} as ReservationQueueService,
  );
}

const dto = {
  memberId: '6c1f2a3b-4d5e-4f6a-8b7c-9d0e1f2a3b4c',
  inventoryNumber: 'INV-002301',
};

describe('LoansService', () => {
  it('kršitev delnega indeksa loan_one_open_per_copy prevede v »Izvod … je že izposojen.«', async () => {
    const service = setup(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7',
      }),
    );

    await expect(service.create(dto, 'knjiznicar')).rejects.toThrow(
      new ConflictException('Izvod INV-002301 je že izposojen.'),
    );
  });

  it('druge napake posreduje naprej', async () => {
    const error = new Error('povezava z bazo je prekinjena');
    const service = setup(error);

    await expect(service.create(dto, 'knjiznicar')).rejects.toBe(error);
  });
});
