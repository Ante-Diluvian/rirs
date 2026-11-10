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

  // ADR-0012: položaj se ne shranjuje, je 1 + čakajoče rezervacije istega
  // naslova z manjšim parom (created_at, id); vrne samo čakajoče rezervacije
  async positions(
    db: Prisma.TransactionClient,
    reservationIds: string[],
  ): Promise<Map<string, number>> {
    if (reservationIds.length === 0) return new Map();
    const rows = await db.$queryRaw<{ id: string; position: number }[]>`
      SELECT r.id, 1 + (
        SELECT count(*) FROM reservation o
        WHERE o.book_id = r.book_id AND o.status = 'WAITING'
          AND (o.created_at, o.id) < (r.created_at, r.id)
      )::int AS position
      FROM reservation r
      WHERE r.id = ANY(${reservationIds}::uuid[]) AND r.status = 'WAITING'`;
    return new Map(rows.map((row) => [row.id, row.position]));
  }
}
