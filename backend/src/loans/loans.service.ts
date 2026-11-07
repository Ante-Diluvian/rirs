import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClockService } from '../common/clock.service';
import { addDays, toDbDate } from '../common/dates';
import { Messages } from '../common/messages';
import { isPrismaError } from '../common/prisma-errors';
import {
  CopyStatus,
  LoanStatus,
  Prisma,
  ReservationStatus,
} from '../generated/prisma/client';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationQueueService } from '../reservations/reservation-queue.service';
import { SettingsService } from '../settings/settings.service';
import { LoanCheckDto } from './dto/loan-check.dto';
import { LoanRequestDto } from './dto/loan-request.dto';
import { LoanDto } from './dto/loan.dto';
import { LoanPolicy } from './loan-policy';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
    private readonly members: MembersService,
    private readonly policy: LoanPolicy,
    private readonly queue: ReservationQueueService,
  ) {}

  // samo preveri pravila, ničesar ne spremeni
  async check(dto: LoanRequestDto): Promise<LoanCheckDto> {
    const { checks, settings } = await this.evaluate(this.prisma, dto);
    return {
      checks,
      dueDate: addDays(this.clock.today(), settings.loanPeriodDays),
      loanPeriodDays: settings.loanPeriodDays,
    };
  }

  async create(dto: LoanRequestDto, librarianId: string): Promise<LoanDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // zaklenemo člana in izvod, da dve sočasni izposoji ne obideta pravil
        await tx.$queryRaw`SELECT id FROM member WHERE id = ${dto.memberId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM copy WHERE inventory_number = ${dto.inventoryNumber} FOR UPDATE`;

        const { copy, checks, settings } = await this.evaluate(tx, dto);
        const failed = checks.find((check) => !check.passed);
        if (failed) throw new ConflictException(failed.message);

        const today = this.clock.today();
        const loan = await tx.loan.create({
          data: {
            memberId: dto.memberId,
            copyId: copy.id,
            librarianId,
            loanedOn: toDbDate(today),
            dueDate: toDbDate(addDays(today, settings.loanPeriodDays)),
            status: LoanStatus.ACTIVE,
          },
        });
        await tx.copy.update({
          where: { id: copy.id },
          data: { status: CopyStatus.ON_LOAN },
        });
        await this.fulfillReservation(tx, dto.memberId, copy);
        return LoanDto.from(loan, copy);
      });
    } catch (error) {
      // druga varovalka je delni indeks loan_one_open_per_copy
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          Messages.loans.copyOnLoan(dto.inventoryNumber),
        );
      }
      throw error;
    }
  }

  private async evaluate(
    db: Prisma.TransactionClient,
    { memberId, inventoryNumber }: LoanRequestDto,
  ) {
    const [member, copy] = await Promise.all([
      db.member.findUnique({ where: { id: memberId } }),
      db.copy.findUnique({
        where: { inventoryNumber },
        include: { book: { select: { title: true } } },
      }),
    ]);
    if (!member) throw new NotFoundException(Messages.members.notFound);
    if (!copy) {
      throw new NotFoundException(Messages.loans.copyNotFound(inventoryNumber));
    }

    const [settings, account, reservation] = await Promise.all([
      this.settings.get(),
      this.members.account(memberId, db),
      db.reservation.findFirst({
        where: { copyId: copy.id, memberId, status: ReservationStatus.READY },
        select: { id: true },
      }),
    ]);

    const checks = this.policy.check(
      {
        isBlocked: member.isBlocked,
        activeLoans: account.activeLoans.length,
        unpaidFineCents: account.unpaidFineCents,
        copy,
        copyReservedForMember: reservation !== null,
        hasSameTitle: account.activeLoans.some(
          (loan) => loan.bookId === copy.bookId,
        ),
      },
      settings,
    );
    return { copy, settings, checks };
  }

  // US-03 AC5: rezervacija Na voljo tega člana za ta naslov je izpolnjena;
  // če je bil zanj rezerviran drug izvod, ta gre naslednjemu v vrsti
  private async fulfillReservation(
    tx: Prisma.TransactionClient,
    memberId: string,
    copy: { id: string; bookId: string },
  ): Promise<void> {
    const ready = await tx.reservation.findFirst({
      where: { memberId, bookId: copy.bookId, status: ReservationStatus.READY },
    });
    if (!ready) return;

    await tx.reservation.update({
      where: { id: ready.id },
      data: { status: ReservationStatus.FULFILLED },
    });
    if (ready.copyId && ready.copyId !== copy.id) {
      await this.queue.assignNextOrRelease(tx, ready.copyId, copy.bookId);
    }
  }
}
