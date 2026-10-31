import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../generated/prisma/client';
import { createPrismaAdapter } from './prisma-adapter';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: createPrismaAdapter(config.getOrThrow<string>('DATABASE_URL')),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
