import { ApiProperty } from '@nestjs/swagger';
import { Member, Role } from '../../generated/prisma/client';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maja' })
  firstName: string;

  @ApiProperty({ example: 'Kovač' })
  lastName: string;

  @ApiProperty({ example: 'maja.kovac@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.READER })
  role: Role;

  static from(member: Member): UserDto {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
    };
  }
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT for the Authorization: Bearer header' })
  accessToken: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
