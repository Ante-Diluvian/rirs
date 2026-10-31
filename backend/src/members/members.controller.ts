import {
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user';
import { UserDto } from '../auth/dto/user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Messages } from '../common/messages';
import { Role } from '../generated/prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';
import { MembersService } from './members.service';

const memberIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.members.notFound),
});

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign a role to a member (admin only)' })
  @ApiOkResponse({ type: UserDto })
  @ApiBadRequestResponse({ description: 'Unknown role' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({
    description: 'Member does not exist, or the caller is not an admin',
  })
  @ApiConflictResponse({ description: 'Admins cannot change their own role' })
  updateRole(
    @Param('id', memberIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDto> {
    return this.members.updateRole(id, dto.role, user);
  }
}
