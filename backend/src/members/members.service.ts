import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { UserDto } from '../auth/dto/user.dto';
import { Messages } from '../common/messages';
import { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // nova vloga velja šele z novim žetonom (ADR-0014)
  async updateRole(id: string, role: Role, admin: AuthUser): Promise<UserDto> {
    // brez tega bi se lahko zadnji administrator zaklenil ven
    if (id === admin.id) throw new ConflictException(Messages.members.ownRole);

    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(Messages.members.notFound);

    const updated = await this.prisma.member.update({
      where: { id },
      data: { role },
    });
    return UserDto.from(updated);
  }
}
