import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Role } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { resetDatabase } from './factories';

const maja = {
  firstName: 'Maja',
  lastName: 'Kovač',
  email: 'maja.kovac@example.com',
  password: 'geslo1234',
};

interface AuthBody {
  accessToken: string;
  user: Record<string, unknown>;
}

function decodeToken(token: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString(),
  ) as Record<string, unknown>;
}

jest.setTimeout(30_000);

describe('US-01 Registracija in prijava', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (body: object) =>
    request(app.getHttpServer()).post('/auth/register').send(body);
  const login = (body: object) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  describe('AC1: registracija', () => {
    it('ustvari račun bralca in ga takoj prijavi', async () => {
      const res = await register({
        ...maja,
        email: ' Maja.Kovac@Example.com ',
      }).expect(201);
      const body = res.body as AuthBody;

      expect(body.user).toEqual({
        id: expect.any(String) as string,
        firstName: 'Maja',
        lastName: 'Kovač',
        email: 'maja.kovac@example.com',
        role: Role.READER,
      });
      expect(body.accessToken).toEqual(expect.any(String));

      const saved = await prisma.member.findUniqueOrThrow({
        where: { email: 'maja.kovac@example.com' },
      });
      expect(saved.passwordHash).not.toBe(maja.password);
      expect(await bcrypt.compare(maja.password, saved.passwordHash)).toBe(
        true,
      );
      expect(bcrypt.getRounds(saved.passwordHash)).toBe(12);
    });

    it('brez polj vrne napako ob vsakem polju in računa ne ustvari', async () => {
      const res = await register({}).expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        message: 'Neveljavni podatki',
        errors: {
          firstName: 'Vnesi ime',
          lastName: 'Vnesi priimek',
          email: 'Vnesi veljaven e-poštni naslov',
          password: 'Geslo mora imeti vsaj 8 znakov',
        },
      });
      expect(await prisma.member.count()).toBe(0);
    });

    it('ime in priimek iz samih presledkov štejeta kot manjkajoča', async () => {
      const res = await register({
        ...maja,
        firstName: '   ',
        lastName: '\t',
      }).expect(400);

      expect((res.body as { errors: object }).errors).toEqual({
        firstName: 'Vnesi ime',
        lastName: 'Vnesi priimek',
      });
      expect(await prisma.member.count()).toBe(0);
    });

    it('zavrne geslo s 7 znaki z napako ob polju in računa ne ustvari', async () => {
      const res = await register({ ...maja, password: 'geslo12' }).expect(400);

      expect(res.body).toMatchObject({
        errors: { password: 'Geslo mora imeti vsaj 8 znakov' },
      });
      expect(Object.keys((res.body as { errors: object }).errors)).toEqual([
        'password',
      ]);
      expect(await prisma.member.count()).toBe(0);
    });

    it('sprejme geslo z natanko 8 znaki', async () => {
      await register({ ...maja, password: 'geslo123' }).expect(201);
    });

    it('zavrne geslo, daljše od 72 bajtov (ADR-0015)', async () => {
      const res = await register({ ...maja, password: 'č'.repeat(37) }).expect(
        400,
      );

      expect(res.body).toMatchObject({
        errors: { password: 'Geslo je predolgo, največ 72 znakov' },
      });
      expect(await prisma.member.count()).toBe(0);
    });
  });

  describe('AC3: vloga novega računa', () => {
    it('nov račun ima vedno vlogo bralec', async () => {
      const res = await register(maja).expect(201);

      expect((res.body as AuthBody).user.role).toBe(Role.READER);
      const saved = await prisma.member.findUniqueOrThrow({
        where: { email: maja.email },
      });
      expect(saved.role).toBe(Role.READER);
    });

    it('vloge ni mogoče nastaviti ob registraciji', async () => {
      await register({ ...maja, role: Role.ADMIN }).expect(400);

      expect(await prisma.member.count()).toBe(0);
    });
  });

  describe('AC2: obstoječa e-pošta', () => {
    it('zavrne račun z obstoječo e-pošto s sporočilom »Račun s to e-pošto že obstaja«', async () => {
      await register(maja).expect(201);

      const res = await register({
        ...maja,
        firstName: 'Druga',
        email: 'MAJA.KOVAC@example.com',
      }).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message: 'Račun s to e-pošto že obstaja',
      });
      expect(await prisma.member.count()).toBe(1);
    });
  });

  describe('AC4: prijava', () => {
    beforeEach(async () => {
      await register(maja).expect(201);
    });

    it('s pravilnimi podatki vrne žeton s sub in vlogo, veljaven 1 uro', async () => {
      const res = await login({
        email: 'Maja.Kovac@example.com',
        password: maja.password,
      }).expect(200);
      const body = res.body as AuthBody;
      const payload = decodeToken(body.accessToken);

      expect(body.user).toMatchObject({
        email: maja.email,
        role: Role.READER,
      });
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(payload).toMatchObject({
        sub: body.user.id,
        role: Role.READER,
      });
      expect(Number(payload.exp) - Number(payload.iat)).toBe(3600);
    });

    it('napačno geslo in neznana e-pošta vrneta enak odgovor »Napačna e-pošta ali geslo«', async () => {
      const wrongPassword = await login({
        email: maja.email,
        password: 'napacno-geslo',
      }).expect(401);
      const unknownEmail = await login({
        email: 'ne.obstaja@example.com',
        password: maja.password,
      }).expect(401);

      expect(wrongPassword.body).toEqual({
        statusCode: 401,
        message: 'Napačna e-pošta ali geslo',
        error: 'Unauthorized',
      });
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });
  });

  describe('GET /me', () => {
    it('vrne prijavljenega uporabnika brez passwordHash', async () => {
      const { body } = (await register(maja).expect(201)) as {
        body: AuthBody;
      };

      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);

      expect(res.body).toEqual(body.user);
    });

    it('brez žetona ali z neveljavnim žetonom vrne 401', async () => {
      await request(app.getHttpServer()).get('/me').expect(401);
      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', 'Bearer ni.veljaven.zeton')
        .expect(401);

      expect(res.body).toMatchObject({ message: 'Za dostop se prijavi.' });
    });
  });
});
