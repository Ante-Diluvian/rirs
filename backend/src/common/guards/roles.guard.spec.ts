import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { RolesGuard } from './roles.guard';

function contextFor(role?: Role): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 'id', role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  function withRoles(roles: Role[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  }

  it('brez @Roles spusti vsakega prijavljenega', () => {
    withRoles(undefined);

    expect(guard.canActivate(contextFor(Role.READER))).toBe(true);
  });

  it('spusti uporabnika z ustrezno vlogo', () => {
    withRoles([Role.LIBRARIAN, Role.ADMIN]);

    expect(guard.canActivate(contextFor(Role.LIBRARIAN))).toBe(true);
    expect(guard.canActivate(contextFor(Role.ADMIN))).toBe(true);
  });

  it('za napačno vlogo vrne 404 »Ta stran ne obstaja« (US-01 AC5)', () => {
    withRoles([Role.LIBRARIAN, Role.ADMIN]);

    expect(() => guard.canActivate(contextFor(Role.READER))).toThrow(
      new NotFoundException('Ta stran ne obstaja'),
    );
    expect(() => guard.canActivate(contextFor())).toThrow(NotFoundException);
  });
});
