import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { Messages } from './messages';

const RESPONSES: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: Messages.database.duplicate },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: Messages.database.relationConflict,
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: Messages.database.notFound },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = RESPONSES[error.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: Messages.database.unexpected,
    };
    if (mapped.status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${error.code}: ${error.message}`, error.stack);
    }

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(mapped.status)
      .json({ statusCode: mapped.status, message: mapped.message });
  }
}
