import { randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Roles } from '../src/common/decorators/roles.decorator';
import { Member, Role } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createUser, login, resetDatabase } from './factories';

// pot za knjižničarje, dokler je ne prinese T11 (npr. pult)
@Controller('test-librarian-only')
class LibrarianOnlyController {
  @Get()
  @Roles(Role.LIBRARIAN, Role.ADMIN)
  ok() {
    return { ok: true };
  }
}

jest.setTimeout(30_000);

describe('US-01 Registracija in prijava: vloge', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reader: Member;
  let librarian: Member;
  let admin: Member;
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [LibrarianOnlyController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    reader = await createUser(prisma, Role.READER);
    librarian = await createUser(prisma, Role.LIBRARIAN);
    admin = await createUser(prisma, Role.ADMIN);
    tokens.reader = await login(app, reader.email);
    tokens.librarian = await login(app, librarian.email);
    tokens.admin = await login(app, admin.email);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const setRole = (id: string, role: unknown, token?: string) => {
    const req = http().patch(`/members/${id}/role`).send({ role });
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const roleOf = async (id: string) =>
    (await prisma.member.findUniqueOrThrow({ where: { id } })).role;

  describe('AC5: dostop po vlogi', () => {
    it('bralec na poti za knjižničarje dobi 404 »Ta stran ne obstaja«', async () => {
      const res = await http()
        .get('/test-librarian-only')
        .set('Authorization', `Bearer ${tokens.reader}`)
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        message: 'Ta stran ne obstaja',
      });
    });

    it('knjižničar in administrator imata dostop do poti za knjižničarje', async () => {
      for (const token of [tokens.librarian, tokens.admin]) {
        await http()
          .get('/test-librarian-only')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .expect({ ok: true });
      }
    });

    it('brez prijave so zaščitene vse poti razen javnih (401)', async () => {
      await http().get('/test-librarian-only').expect(401);
      await http().get('/me').expect(401);
      await setRole(reader.id, Role.ADMIN).expect(401);

      await http().get('/health').expect(200);
      await http()
        .post('/auth/login')
        .send({ email: reader.email, password: 'napacno-geslo' })
        .expect(401)
        .expect((res) => {
          expect((res.body as { message: string }).message).toBe(
            'Napačna e-pošta ali geslo',
          );
        });
    });
  });

  describe('AC3: dodelitev vloge', () => {
    it('bralec ne more dodeliti vloge, niti sebi', async () => {
      await setRole(reader.id, Role.ADMIN, tokens.reader).expect(404);
      await setRole(librarian.id, Role.READER, tokens.reader).expect(404);

      expect(await roleOf(reader.id)).toBe(Role.READER);
      expect(await roleOf(librarian.id)).toBe(Role.LIBRARIAN);
    });

    it('knjižničar ne more dodeliti vloge', async () => {
      await setRole(reader.id, Role.LIBRARIAN, tokens.librarian).expect(404);
      await setRole(librarian.id, Role.ADMIN, tokens.librarian).expect(404);

      expect(await roleOf(reader.id)).toBe(Role.READER);
      expect(await roleOf(librarian.id)).toBe(Role.LIBRARIAN);
    });

    it('administrator dodeli vlogo, ki velja z novim žetonom', async () => {
      const res = await setRole(reader.id, Role.LIBRARIAN, tokens.admin).expect(
        200,
      );

      expect(res.body).toEqual({
        id: reader.id,
        firstName: reader.firstName,
        lastName: reader.lastName,
        email: reader.email,
        role: Role.LIBRARIAN,
      });
      expect(await roleOf(reader.id)).toBe(Role.LIBRARIAN);

      const newToken = await login(app, reader.email);
      await http()
        .get('/test-librarian-only')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });

    it('administrator lahko vlogo tudi odvzame', async () => {
      await setRole(librarian.id, Role.READER, tokens.admin).expect(200);

      expect(await roleOf(librarian.id)).toBe(Role.READER);
    });

    it('zavrne neznano vlogo z napako ob polju', async () => {
      const res = await setRole(reader.id, 'SUPERUSER', tokens.admin).expect(
        400,
      );

      expect(res.body).toMatchObject({
        errors: { role: 'Vloga mora biti READER, LIBRARIAN ali ADMIN.' },
      });
      expect(await roleOf(reader.id)).toBe(Role.READER);
    });

    it('za neobstoječega člana vrne 404 »Član ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await setRole(id, Role.LIBRARIAN, tokens.admin).expect(404);
        expect(res.body).toMatchObject({ message: 'Član ne obstaja.' });
      }
    });

    it('administrator ne more spremeniti svoje vloge', async () => {
      const res = await setRole(admin.id, Role.READER, tokens.admin).expect(
        409,
      );

      expect(res.body).toMatchObject({
        message: 'Svoje vloge ne moreš spremeniti.',
      });
      expect(await roleOf(admin.id)).toBe(Role.ADMIN);
    });
  });
});
