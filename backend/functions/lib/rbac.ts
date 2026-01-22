import { Role } from './types';

export function getRoleFromToken(token?: Record<string, any>): Role | null {
  if (!token) return null;
  const role = token.role;
  return ['dev', 'admin', 'member'].includes(role) ? (role as Role) : null;
}

export function requireRole(token: Record<string, any> | undefined, minimum: Role[]): Role | null {
  const role = getRoleFromToken(token);
  if (!role) return null;
  const hierarchy: Record<Role, number> = { member: 0, admin: 1, dev: 2 };
  const allowed = minimum.some((min) => hierarchy[role] >= hierarchy[min]);
  return allowed ? role : null;
}