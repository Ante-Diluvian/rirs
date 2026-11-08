import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { UserDto } from '../auth/dto/user.dto';
import { ClockService } from '../common/clock.service';
import { fromDbDate } from '../common/dates';
import { Messages } from '../common/messages';
import { decimalToCents, formatCents } from '../common/money';
import { FineCalculator } from '../fines/fine-calculator';
import { LoanStatus, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { MemberSummaryDto } from './dto/member-summary.dto';

export const MEMBER_SEARCH_LIMIT = 20;

export interface MemberAccount {
  activeLoans: { bookId: string; dueDate: string }[];
  unpaidFineCents: number;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
    private readonly fines: FineCalculator,
  ) {}

  // vsaka beseda se mora pojaviti v imenu, priimku ali e-pošti
  async search(query = ''): Promise<UserDto[]> {
    const words = query.split(/\s+/).filter(Boolean);
    const members = await this.prisma.member.findMany({
      where: {
        AND: words.map((word) => ({
          OR: [
            { firstName: { contains: word, mode: 'insensitive' } },
            { lastName: { contains: word, mode: 'insensitive' } },
            { email: { contains: word, mode: 'insensitive' } },
          ],
        })),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      take: MEMBER_SEARCH_LIMIT,
    });
    return members.map((member) => UserDto.from(member));
  }

  async summary(id: string): Promise<MemberSummaryDto> {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(Messages.members.notFound);

    const [settings, account] = await Promise.all([
      this.settings.get(),
      this.account(id),
    ]);
    return {
      ...UserDto.from(member),
      activeLoans: account.activeLoans.length,
      maxActiveLoans: settings.maxActiveLoans,
      unpaidFine: formatCents(account.unpaidFineCents),
      isBlocked: member.isBlocked,
    };
  }

  // aktivne izposoje in neplačana zamudnina za povzetek in pravila izposoje,
  // izposoja jih bere znotraj svoje transakcije
  async account(
    memberId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<MemberAccount> {
    const [settings, activeLoans, returned] = await Promise.all([
      this.settings.get(),
      db.loan.findMany({
        where: { memberId, status: { not: LoanStatus.RETURNED } },
        select: { dueDate: true, copy: { select: { bookId: true } } },
      }),
      db.loan.aggregate({
        where: {
          memberId,
          status: LoanStatus.RETURNED,
          finePaid: false,
          fineWaived: false,
        },
        _sum: { fineAmount: true },
      }),
    ]);

    // zamujenost se v MVP izračuna ob branju, status OVERDUE se ne nastavlja
    const today = this.clock.today();
    const loans = activeLoans.map((loan) => ({
      bookId: loan.copy.bookId,
      dueDate: fromDbDate(loan.dueDate),
    }));
    const runningFineCents = loans.reduce(
      (sum, loan) =>
        sum + this.fines.calculate(loan.dueDate, today, settings).fineCents,
      0,
    );
    const returnedFine = returned._sum.fineAmount;
    return {
      activeLoans: loans,
      unpaidFineCents:
        (returnedFine ? decimalToCents(returnedFine) : 0) + runningFineCents,
    };
  }

  // nova vloga velja šele z novim žetonom (ADR-0014)
  async updateRole(id: string, role: Role, admin: AuthUser): Promise<UserDto> {
    // brez tega bi se lahko zadnji administrator zaklenil ven
    if (id === admin.id) throw new ConflictException(Messages.members.ownRole);

    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(Messages.members.notFound);

    const updated = await this.prisma.member.update({
      where: { id },
      data: { role },
    });
    return UserDto.from(updated);
  }
}
