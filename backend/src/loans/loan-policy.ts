import { Injectable } from '@nestjs/common';
import { Messages } from '../common/messages';
import { formatEuro } from '../common/money';
import { CopyStatus } from '../generated/prisma/client';
import { Settings } from '../settings/settings.service';

export enum LoanRule {
  MEMBER_NOT_BLOCKED = 'MEMBER_NOT_BLOCKED',
  MAX_ACTIVE_LOANS = 'MAX_ACTIVE_LOANS',
  FINE_LIMIT = 'FINE_LIMIT',
  COPY_AVAILABLE = 'COPY_AVAILABLE',
  SAME_TITLE = 'SAME_TITLE',
}

export interface LoanRuleCheck {
  rule: LoanRule;
  passed: boolean;
  message: string;
}

export interface LoanContext {
  isBlocked: boolean;
  activeLoans: number;
  unpaidFineCents: number;
  copy: { inventoryNumber: string; status: CopyStatus };
  // član ima rezervacijo READY prav za ta izvod
  copyReservedForMember: boolean;
  hasSameTitle: boolean;
}

function result(
  rule: LoanRule,
  passed: boolean,
  ok: string,
  failed: string,
): LoanRuleCheck {
  return { rule, passed, message: passed ? ok : failed };
}

function copyCheck({ copy, copyReservedForMember }: LoanContext) {
  const inv = copy.inventoryNumber;
  const check = (passed: boolean, message: string) => ({
    rule: LoanRule.COPY_AVAILABLE,
    passed,
    message,
  });
  switch (copy.status) {
    case CopyStatus.AVAILABLE:
      return check(true, Messages.loans.copyAvailable);
    case CopyStatus.RESERVED:
      return copyReservedForMember
        ? check(true, Messages.loans.copyReservedForMember)
        : check(false, Messages.loans.copyReservedForOther(inv));
    case CopyStatus.ON_LOAN:
      return check(false, Messages.loans.copyOnLoan(inv));
    case CopyStatus.LOST:
      return check(false, Messages.loans.copyLost(inv));
  }
}

// pravila izposoje brez HTTP in baze; vrstni red je pomemben, ker
// POST /loans zavrne izposojo s sporočilom prvega neizpolnjenega pravila
@Injectable()
export class LoanPolicy {
  check(context: LoanContext, settings: Settings): LoanRuleCheck[] {
    const { maxActiveLoans, fineLimitCents } = settings;
    const limit = formatEuro(fineLimitCents);
    return [
      result(
        LoanRule.MEMBER_NOT_BLOCKED,
        !context.isBlocked,
        Messages.loans.memberNotBlocked,
        Messages.loans.memberBlocked,
      ),
      result(
        LoanRule.MAX_ACTIVE_LOANS,
        context.activeLoans < maxActiveLoans,
        Messages.loans.belowMaxLoans(maxActiveLoans),
        Messages.loans.maxLoans(maxActiveLoans),
      ),
      // zavrnemo samo zamudnino, ki je višja od meje
      result(
        LoanRule.FINE_LIMIT,
        context.unpaidFineCents <= fineLimitCents,
        Messages.loans.withinFineLimit(limit),
        Messages.loans.fineLimit(formatEuro(context.unpaidFineCents), limit),
      ),
      copyCheck(context),
      result(
        LoanRule.SAME_TITLE,
        !context.hasSameTitle,
        Messages.loans.noSameTitle,
        Messages.loans.sameTitle,
      ),
    ];
  }
}
