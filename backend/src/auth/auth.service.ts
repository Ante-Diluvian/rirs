import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Messages } from '../common/messages';
import { Member, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, JwtPayload } from './auth-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserDto } from './dto/user.dto';

export const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  // z njo compare traja enako dolgo tudi za neznano e-pošto
  private readonly dummyHash = bcrypt.hash(
    randomBytes(16).toString('hex'),
    BCRYPT_ROUNDS,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException(Messages.auth.emailTaken);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const member = await this.prisma.member.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          passwordHash,
          role: Role.READER,
        },
      });
      return this.issueToken(member);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(Messages.auth.emailTaken);
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const member = await this.prisma.member.findUnique({
      where: { email: dto.email },
    });
    const valid = await bcrypt.compare(
      dto.password,
      member?.passwordHash ?? (await this.dummyHash),
    );
    if (!member || !valid) {
      throw new UnauthorizedException(Messages.auth.invalidCredentials);
    }
    return this.issueToken(member);
  }

  async me(user: AuthUser): Promise<UserDto> {
    const member = await this.prisma.member.findUnique({
      where: { id: user.id },
    });
    if (!member) throw new UnauthorizedException(Messages.auth.unauthorized);
    return UserDto.from(member);
  }

  private async issueToken(member: Member): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: member.id, role: member.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: UserDto.from(member),
    };
  }
}
