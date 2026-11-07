import { Injectable, Logger } from '@nestjs/common';
import { parseCents } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';

// pravila izposoje in rezervacij iz tabele setting, zneski v centih
export interface Settings {
  loanPeriodDays: number;
  finePerDayCents: number;
  maxActiveLoans: number;
  fineLimitCents: number;
  maxActiveReservations: number;
  pickupDays: number;
}

interface Rule {
  key: string;
  parse: (value: string) => number | null;
  expected: string;
}

// US-15 AC2: pozitivna cela števila, zneska >= 0
const positiveInteger = {
  parse: (value: string) => {
    const n = /^\d+$/.test(value) ? Number(value) : NaN;
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  },
  expected: 'pozitivno celo število',
};

const amount = {
  parse: parseCents,
  expected: 'znesek ≥ 0 z največ dvema decimalkama, npr. 0.10',
};

const RULES: Record<keyof Settings, Rule> = {
  loanPeriodDays: { key: 'loan_period_days', ...positiveInteger },
  finePerDayCents: { key: 'fine_per_day', ...amount },
  maxActiveLoans: { key: 'max_active_loans', ...positiveInteger },
  fineLimitCents: { key: 'fine_limit', ...amount },
  maxActiveReservations: { key: 'max_active_reservations', ...positiveInteger },
  pickupDays: { key: 'pickup_days', ...positiveInteger },
};

function parseSettings(rows: { key: string; value: string }[]): Settings {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const settings: Partial<Settings> = {};
  const problems: string[] = [];
  let missing = false;

  for (const name of Object.keys(RULES) as (keyof Settings)[]) {
    const rule = RULES[name];
    const value = values.get(rule.key);
    if (value === undefined) {
      problems.push(`${rule.key} manjka`);
      missing = true;
      continue;
    }
    const parsed = rule.parse(value);
    if (parsed === null) {
      problems.push(`${rule.key} = »${value}« ni ${rule.expected}`);
    } else {
      settings[name] = parsed;
    }
  }

  if (problems.length > 0) {
    // seed zapiše samo manjkajoče ključe, obstoječih vrednosti ne prepiše
    const hint = missing
      ? ' Manjkajoče privzete vrednosti zapiše seed (npm run db:seed).'
      : '';
    throw new Error(
      `Nastavitve pravil v tabeli setting niso veljavne: ${problems.join('; ')}.${hint}`,
    );
  }
  return settings as Settings;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cached: Settings | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // dokler vrednosti niso veljavne, jih vsak klic prebere znova
  async get(): Promise<Settings> {
    return this.cached ?? this.reload();
  }

  // po vsaki spremembi tabele setting
  async reload(): Promise<Settings> {
    this.cached = parseSettings(await this.prisma.setting.findMany());
    return this.cached;
  }

  // ob zagonu samo izpiše napako, ker seed pravila zapiše šele po prvem zagonu
  async check(): Promise<void> {
    try {
      await this.reload();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : error);
    }
  }
}
