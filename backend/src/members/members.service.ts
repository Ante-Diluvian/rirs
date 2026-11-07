import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { UserDto } from '../auth/dto/user.dto';
import { ClockService } from '../common/clock.service';
import { diffDays, fromDbDate } from '../common/dates';
import { Messages } from '../common/messages';
import { decimalToCents, formatCents } from '../common/money';
import { LoanStatus, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { MemberSummaryDto } from './dto/member-summary.dto';

export const MEMBER_SEARCH_LIMIT = 20;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
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

    const [settings, activeLoans, returned] = await Promise.all([
      this.settings.get(),
      this.prisma.loan.findMany({
        where: { memberId: id, status: { not: LoanStatus.RETURNED } },
        select: { dueDate: true },
      }),
      this.prisma.loan.aggregate({
        where: {
          memberId: id,
          status: LoanStatus.RETURNED,
          finePaid: false,
          fineWaived: false,
        },
        _sum: { fineAmount: true },
      }),
    ]);

    // zamujenost se v MVP izračuna ob branju, status OVERDUE se ne nastavlja
    const today = this.clock.today();
    const overdueDays = activeLoans.reduce(
      (days, loan) =>
        days + Math.max(0, diffDays(today, fromDbDate(loan.dueDate))),
      0,
    );
    const returnedFine = returned._sum.fineAmount;
    const unpaidFineCents =
      (returnedFine ? decimalToCents(returnedFine) : 0) +
      overdueDays * settings.finePerDayCents;

    return {
      ...UserDto.from(member),
      activeLoans: activeLoans.length,
      maxActiveLoans: settings.maxActiveLoans,
      unpaidFine: formatCents(unpaidFineCents),
      isBlocked: member.isBlocked,
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
