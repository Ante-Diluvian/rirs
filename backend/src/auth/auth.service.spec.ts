import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Member, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const member: Member = {
  id: '6f1c2b8e-3d4a-4b5c-9e7f-1a2b3c4d5e6f',
  firstName: 'Maja',
  lastName: 'Kovač',
  email: 'maja.kovac@example.com',
  passwordHash: '$2b$12$abcdefghijklmnopqrstuuJ8hQ7cS1Q8bS1Q8bS1Q8bS1Q8bS1Q8b',
  role: Role.READER,
  phone: null,
  city: null,
  joinedOn: new Date('2026-10-12'),
  isBlocked: false,
  createdAt: new Date('2026-10-12T10:00:00Z'),
};

describe('AuthService', () => {
  let prisma: {
    member: { findUnique: jest.Mock; create: jest.Mock };
  };
  let service: AuthService;

  beforeEach(() => {
    prisma = { member: { findUnique: jest.fn(), create: jest.fn() } };
    const jwt = { signAsync: jest.fn().mockResolvedValue('zeton') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pri neznani e-pošti vseeno izvede compare in vrne enako napako', async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    const compare = jest.spyOn(bcrypt, 'compare');

    await expect(
      service.login({ email: 'ni@example.com', password: 'geslo1234' }),
    ).rejects.toThrow(new UnauthorizedException('Napačna e-pošta ali geslo'));
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('pri napačnem geslu vrne enako napako kot pri neznani e-pošti', async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.login({ email: member.email, password: 'napacno-geslo' }),
    ).rejects.toThrow(new UnauthorizedException('Napačna e-pošta ali geslo'));
  });

  it('nov račun ima vedno vlogo READER in odgovor nima passwordHash', async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockImplementation(
      ({ data }: { data: Prisma.MemberCreateInput }) =>
        Promise.resolve({ ...member, ...data }),
    );

    const result = await service.register({
      firstName: 'Maja',
      lastName: 'Kovač',
      email: member.email,
      password: 'geslo1234',
    });

    const [[{ data }]] = prisma.member.create.mock.calls as [
      [{ data: Prisma.MemberCreateInput }],
    ];
    expect(data.role).toBe(Role.READER);
    expect(data.passwordHash).not.toBe('geslo1234');
    expect(result.user).toEqual({
      id: member.id,
      firstName: 'Maja',
      lastName: 'Kovač',
      email: member.email,
      role: Role.READER,
    });
    expect(result.accessToken).toBe('zeton');
  });

  it('sočasno registracijo z isto e-pošto (P2002) vrne kot 409', async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7',
      }),
    );

    await expect(
      service.register({
        firstName: 'Maja',
        lastName: 'Kovač',
        email: member.email,
        password: 'geslo1234',
      }),
    ).rejects.toThrow(new ConflictException('Račun s to e-pošto že obstaja'));
  });
});
