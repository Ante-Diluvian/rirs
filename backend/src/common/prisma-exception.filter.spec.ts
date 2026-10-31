import { ArgumentsHost, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`napaka ${code}`, {
    code,
    clientVersion: '7',
  });
}

function catchError(code: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new PrismaExceptionFilter().catch(prismaError(code), host);

  return { status, json };
}

describe('PrismaExceptionFilter', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it.each([
    ['P2002', 409, 'Zapis s temi podatki že obstaja.'],
    ['P2003', 409, 'Zapis je povezan z drugimi podatki.'],
    ['P2025', 404, 'Zapis ne obstaja.'],
  ])('%s vrne %i', (code, statusCode, message) => {
    const { status, json } = catchError(code);

    expect(status).toHaveBeenCalledWith(statusCode);
    expect(json).toHaveBeenCalledWith({ statusCode, message });
  });

  it('druge napake vrne kot 500 brez podrobnosti iz baze', () => {
    const { status, json } = catchError('P2010');

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Prišlo je do napake na strežniku.',
    });
  });
});
