import { Injectable } from '@nestjs/common';
import { bookWithAuthors } from '../books/dto/book.dto';
import { ClockService } from '../common/clock.service';
import { dateInLjubljana, fromDbDate } from '../common/dates';
import { formatCents } from '../common/money';
import { FineCalculator } from '../fines/fine-calculator';
import { LoanStatus } from '../generated/prisma/client';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyReservationDto } from '../reservations/dto/reservation.dto';
import { ACTIVE_RESERVATION } from '../reservations/reservation-policy';
import { ReservationQueueService } from '../reservations/reservation-queue.service';
import { SettingsService } from '../settings/settings.service';
import { BookRefDto } from './dto/book-ref.dto';
import { MyLoanDto } from './dto/my-loan.dto';
import { MyReservationItemDto } from './dto/my-reservation-item.dto';
import { MySummaryDto } from './dto/my-summary.dto';
import { loanDeadline } from './loan-deadline';

// US-06 AC5: člana vedno določi žeton, zato podatkov drugih članov ni mogoče zahtevati
@Injectable()
export class MyLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
    private readonly fines: FineCalculator,
    private readonly members: MembersService,
    private readonly queue: ReservationQueueService,
  ) {}

  async loans(memberId: string): Promise<MyLoanDto[]> {
    const [settings, loans] = await Promise.all([
      this.settings.get(),
      this.prisma.loan.findMany({
        where: { memberId, status: { not: LoanStatus.RETURNED } },
        include: { copy: { include: { book: { include: bookWithAuthors } } } },
        orderBy: [{ dueDate: 'asc' }, { loanedOn: 'asc' }, { id: 'asc' }],
      }),
    ]);

    // zamujenost se v MVP izračuna ob branju, status OVERDUE se ne nastavlja
    const today = this.clock.today();
    return loans.map((loan) => {
      const dueDate = fromDbDate(loan.dueDate);
      const fine = this.fines.calculate(dueDate, today, settings);
      return {
        id: loan.id,
        book: BookRefDto.from(loan.copy.book),
        loanedOn: fromDbDate(loan.loanedOn),
        dueDate,
        ...loanDeadline(dueDate, today),
        overdueDays: fine.overdueDays,
        fine: formatCents(fine.fineCents),
      };
    });
  }

  async reservations(memberId: string): Promise<MyReservationItemDto[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { memberId, status: { in: ACTIVE_RESERVATION } },
      include: { book: { include: bookWithAuthors } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const positions = await this.queue.positions(
      this.prisma,
      reservations.map((reservation) => reservation.id),
    );
    return reservations.map((reservation) => ({
      ...MyReservationDto.from(reservation, positions),
      book: BookRefDto.from(reservation.book),
      reservedOn: dateInLjubljana(reservation.createdAt),
    }));
  }

  async summary(memberId: string): Promise<MySummaryDto> {
    const [settings, account, activeReservations] = await Promise.all([
      this.settings.get(),
      this.members.account(memberId),
      this.prisma.reservation.count({
        where: { memberId, status: { in: ACTIVE_RESERVATION } },
      }),
    ]);
    return {
      today: this.clock.today(),
      activeLoans: account.activeLoans.length,
      maxActiveLoans: settings.maxActiveLoans,
      activeReservations,
      maxActiveReservations: settings.maxActiveReservations,
      unpaidFine: formatCents(account.unpaidFineCents),
      fineLimit: formatCents(settings.fineLimitCents),
      // enako kot pri izposoji: ovira je samo zamudnina, višja od meje
      borrowingBlocked: account.unpaidFineCents > settings.fineLimitCents,
    };
  }
}
