import { Role } from '../generated/prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  role: Role;
}
