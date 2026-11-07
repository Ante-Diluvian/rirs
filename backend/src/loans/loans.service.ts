import { Injectable, NotFoundException } from '@nestjs/common';
import { ClockService } from '../common/clock.service';
import { addDays } from '../common/dates';
import { Messages } from '../common/messages';
import { ReservationStatus } from '../generated/prisma/client';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CheckLoanDto } from './dto/check-loan.dto';
import { LoanCheckDto } from './dto/loan-check.dto';
import { LoanPolicy } from './loan-policy';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
    private readonly members: MembersService,
    private readonly policy: LoanPolicy,
  ) {}

  // samo preveri pravila, ničesar ne spremeni
  async check({
    memberId,
    inventoryNumber,
  }: CheckLoanDto): Promise<LoanCheckDto> {
    const [member, copy] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: memberId } }),
      this.prisma.copy.findUnique({ where: { inventoryNumber } }),
    ]);
    if (!member) throw new NotFoundException(Messages.members.notFound);
    if (!copy) {
      throw new NotFoundException(Messages.loans.copyNotFound(inventoryNumber));
    }

    const [settings, account, reservation] = await Promise.all([
      this.settings.get(),
      this.members.account(memberId),
      this.prisma.reservation.findFirst({
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
    return {
      checks,
      dueDate: addDays(this.clock.today(), settings.loanPeriodDays),
      loanPeriodDays: settings.loanPeriodDays,
    };
  }
}
