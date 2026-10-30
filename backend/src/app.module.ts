import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { HealthModule } from './health/health.module';
import { MembersModule } from './members/members.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // .env je v korenu repozitorija
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    MembersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    // vrstni red je pomemben: najprej prijava, nato vloga
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
