import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Messages } from '../../common/messages';
import { Role } from '../../generated/prisma/client';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.LIBRARIAN })
  @IsEnum(Role, { message: Messages.members.roleInvalid })
  role: Role;
}
