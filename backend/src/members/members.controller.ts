import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
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
import { MemberSummaryDto } from './dto/member-summary.dto';
import { SearchMembersDto } from './dto/search-members.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { MembersService } from './members.service';

const memberIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.members.notFound),
});

@ApiTags('members')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @ApiOperation({
    summary: 'Search members by first name, last name or email (max 20)',
  })
  @ApiOkResponse({ type: [UserDto] })
  @ApiBadRequestResponse({ description: 'Query is too long' })
  @ApiNotFoundResponse({ description: 'The caller is not a librarian' })
  search(@Query() query: SearchMembersDto): Promise<UserDto[]> {
    return this.members.search(query.q);
  }

  @Get(':id/summary')
  @Roles(Role.LIBRARIAN, Role.ADMIN, Role.READER)
  @ApiOperation({
    summary:
      'Active loans, unpaid fines and account status of a member; a reader can only get their own',
  })
  @ApiOkResponse({ type: MemberSummaryDto })
  @ApiForbiddenResponse({ description: 'A reader asks for another member' })
  @ApiNotFoundResponse({ description: 'Member does not exist' })
  summary(
    @Param('id', memberIdPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MemberSummaryDto> {
    return this.members.summary(id, user);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign a role to a member (admin only)' })
  @ApiOkResponse({ type: UserDto })
  @ApiBadRequestResponse({ description: 'Unknown role' })
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
