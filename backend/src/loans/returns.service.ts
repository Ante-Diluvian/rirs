import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClockService } from '../common/clock.service';
import { fromDbDate, toDbDate } from '../common/dates';
import { Messages } from '../common/messages';
import { formatCents } from '../common/money';
import { FineCalculator } from '../fines/fine-calculator';
import { CopyStatus, LoanStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignedReservation,
  ReservationQueueService,
} from '../reservations/reservation-queue.service';
import { Settings, SettingsService } from '../settings/settings.service';
import { ReturnPreviewDto } from './dto/return-preview.dto';
import { ReservedForDto, ReturnDto } from './dto/return.dto';

const OPEN_LOAN_INCLUDE = {
  member: { select: { id: true, firstName: true, lastName: true } },
  copy: {
    select: {
      inventoryNumber: true,
      bookId: true,
      book: { select: { title: true } },
    },
  },
} satisfies Prisma.LoanInclude;

type OpenLoan = Prisma.LoanGetPayload<{ include: typeof OPEN_LOAN_INCLUDE }>;

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
    private readonly fines: FineCalculator,
    private readonly queue: ReservationQueueService,
  ) {}

  // US-04 AC1: zamuda in zamudnina, če bi izvod vrnili danes; nič se ne spremeni
  async preview(inventoryNumber: string): Promise<ReturnPreviewDto> {
    const loan = await this.findOpenLoan(this.prisma, inventoryNumber);
    if (!loan) {
      throw new NotFoundException(Messages.returns.notOnLoan(inventoryNumber));
    }
    return this.toPreview(loan, this.clock.today(), await this.settings.get());
  }

  // US-04 AC5: zaprtje izposoje in dodelitev izvoda uspeta ali spodletita skupaj
  returnCopy(inventoryNumber: string): Promise<ReturnDto> {
    return this.prisma.$transaction(async (tx) => {
      // zaklenemo izvod, da se isti izvod ne vrne dvakrat hkrati
      await tx.$queryRaw`SELECT id FROM copy WHERE inventory_number = ${inventoryNumber} FOR UPDATE`;
      const loan = await this.findOpenLoan(tx, inventoryNumber);
      if (!loan) {
        throw new ConflictException(
          Messages.returns.notOnLoan(inventoryNumber),
        );
      }

      const today = this.clock.today();
      const preview = this.toPreview(loan, today, await this.settings.get());
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.RETURNED,
          returnedOn: toDbDate(today),
          fineAmount: preview.fine,
        },
      });
      const assigned = await this.queue.assignNextOrRelease(
        tx,
        loan.copyId,
        loan.copy.bookId,
      );

      return {
        ...preview,
        copyStatus: assigned ? CopyStatus.RESERVED : CopyStatus.AVAILABLE,
        reservedFor: assigned ? await this.reservedFor(tx, assigned) : null,
      };
    });
  }

  private async findOpenLoan(
    db: Prisma.TransactionClient,
    inventoryNumber: string,
  ): Promise<OpenLoan | null> {
    const copy = await db.copy.findUnique({
      where: { inventoryNumber },
      select: { id: true },
    });
    if (!copy) {
      throw new NotFoundException(Messages.loans.copyNotFound(inventoryNumber));
    }
    // delni indeks loan_one_open_per_copy, zato findFirst
    return db.loan.findFirst({
      where: { copyId: copy.id, status: { not: LoanStatus.RETURNED } },
      include: OPEN_LOAN_INCLUDE,
    });
  }

  private toPreview(
    loan: OpenLoan,
    today: string,
    settings: Settings,
  ): ReturnPreviewDto {
    const dueDate = fromDbDate(loan.dueDate);
    const { overdueDays, fineCents } = this.fines.calculate(
      dueDate,
      today,
      settings,
    );
    return {
      loanId: loan.id,
      inventoryNumber: loan.copy.inventoryNumber,
      title: loan.copy.book.title,
      member: loan.member,
      loanedOn: fromDbDate(loan.loanedOn),
      dueDate,
      returnedOn: today,
      overdueDays,
      finePerDay: formatCents(settings.finePerDayCents),
      fine: formatCents(fineCents),
    };
  }

  // za sporočilo »Odloži na polico rezervacij za: …«
  private async reservedFor(
    tx: Prisma.TransactionClient,
    { reservationId, memberId, readyUntil }: AssignedReservation,
  ): Promise<ReservedForDto> {
    const member = await tx.member.findUniqueOrThrow({
      where: { id: memberId },
      select: { firstName: true, lastName: true },
    });
    return { reservationId, memberId, ...member, readyUntil };
  }
}
