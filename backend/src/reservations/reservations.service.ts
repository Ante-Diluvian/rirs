import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Messages } from '../common/messages';
import { isPrismaError } from '../common/prisma-errors';
import {
  CopyStatus,
  LoanStatus,
  ReservationStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ReservationDto } from './dto/reservation.dto';
import { ReservationQueueService } from './reservation-queue.service';
import { ACTIVE_RESERVATION, ReservationPolicy } from './reservation-policy';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly policy: ReservationPolicy,
    private readonly queue: ReservationQueueService,
  ) {}

  async create(memberId: string, bookId: string): Promise<ReservationDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // zaklep člana: sočasni rezervaciji istega člana ne obideta omejitve
        const [member] = await tx.$queryRaw<{ is_blocked: boolean }[]>`
          SELECT is_blocked FROM member WHERE id = ${memberId}::uuid FOR UPDATE`;
        if (!member) throw new NotFoundException(Messages.members.notFound);

        // knjiga pred izvodi, kot pri brisanju knjige; zaklep izvodov počaka
        // sočasno vračilo, da izvod ne postane prost mimo nove rezervacije
        const [book] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM book WHERE id = ${bookId}::uuid FOR SHARE`;
        if (!book) throw new NotFoundException(Messages.books.notFound);
        await tx.$queryRaw`SELECT id FROM copy WHERE book_id = ${bookId}::uuid FOR SHARE`;

        const [settings, availableCopies, active, loans] = await Promise.all([
          this.settings.get(),
          tx.copy.count({ where: { bookId, status: CopyStatus.AVAILABLE } }),
          tx.reservation.findMany({
            where: { memberId, status: { in: ACTIVE_RESERVATION } },
            select: { bookId: true },
          }),
          tx.loan.count({
            where: {
              memberId,
              status: { not: LoanStatus.RETURNED },
              copy: { bookId },
            },
          }),
        ]);

        const violation = this.policy.violation(
          {
            isBlocked: member.is_blocked,
            availableCopies,
            activeReservations: active.length,
            hasSameTitleReservation: active.some((r) => r.bookId === bookId),
            hasSameTitleLoan: loans > 0,
          },
          settings,
        );
        if (violation) throw new ConflictException(violation);

        const reservation = await tx.reservation.create({
          data: { memberId, bookId, status: ReservationStatus.WAITING },
        });
        const positions = await this.queue.positions(tx, [reservation.id]);
        return ReservationDto.from(reservation, positions);
      });
    } catch (error) {
      // druga varovalka je delni indeks reservation_one_active_per_member_book
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(Messages.reservations.duplicate);
      }
      throw error;
    }
  }

  // US-05 AC5: zapis ostane s stanjem CANCELLED, položaji za njim se
  // zmanjšajo sami, ker se izračunajo
  async cancel(memberId: string, reservationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // najprej član, kot pri izposoji, ki rezervacijo Na voljo izpolni
      await tx.$queryRaw`SELECT id FROM member WHERE id = ${memberId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM reservation WHERE id = ${reservationId}::uuid FOR UPDATE`;
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation) {
        throw new NotFoundException(Messages.reservations.notFound);
      }
      if (reservation.memberId !== memberId) {
        throw new ForbiddenException(Messages.reservations.notOwner);
      }
      if (!ACTIVE_RESERVATION.some((status) => status === reservation.status)) {
        throw new ConflictException(Messages.reservations.notActive);
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });
      // izvod, ki je čakal na polici rezervacij, gre naslednjemu v vrsti
      if (
        reservation.status === ReservationStatus.READY &&
        reservation.copyId
      ) {
        await this.queue.assignNextOrRelease(
          tx,
          reservation.copyId,
          reservation.bookId,
        );
      }
    });
  }
}
