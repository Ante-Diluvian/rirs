import { Injectable } from '@nestjs/common';
import { ClockService } from '../common/clock.service';
import { addDays, toDbDate } from '../common/dates';
import {
  CopyStatus,
  Prisma,
  ReservationStatus,
} from '../generated/prisma/client';
import { SettingsService } from '../settings/settings.service';

export interface AssignedReservation {
  reservationId: string;
  memberId: string;
  readyUntil: string;
}

// uporabljajo ga izposoja, vračilo (US-04) in preklic rezervacije (US-05)
@Injectable()
export class ReservationQueueService {
  constructor(
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  // izvod dobi najstarejša čakajoča rezervacija naslova, sicer je prost
  async assignNextOrRelease(
    tx: Prisma.TransactionClient,
    copyId: string,
    bookId: string,
  ): Promise<AssignedReservation | null> {
    // SKIP LOCKED, da dve sočasni transakciji ne izbereta iste rezervacije
    const [next] = await tx.$queryRaw<{ id: string; member_id: string }[]>`
      SELECT id, member_id FROM reservation
      WHERE book_id = ${bookId}::uuid AND status = 'WAITING'
      ORDER BY created_at, id
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;

    if (!next) {
      await tx.copy.update({
        where: { id: copyId },
        data: { status: CopyStatus.AVAILABLE },
      });
      return null;
    }

    const { pickupDays } = await this.settings.get();
    const readyUntil = addDays(this.clock.today(), pickupDays);
    await tx.reservation.update({
      where: { id: next.id },
      data: {
        status: ReservationStatus.READY,
        copyId,
        readyUntil: toDbDate(readyUntil),
      },
    });
    await tx.copy.update({
      where: { id: copyId },
      data: { status: CopyStatus.RESERVED },
    });
    return { reservationId: next.id, memberId: next.member_id, readyUntil };
  }
}
