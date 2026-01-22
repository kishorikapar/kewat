import { getRoleFromToken, requireRole } from '../lib/rbac';

describe('RBAC Helpers', () => {
  describe('getRoleFromToken', () => {
    it('should return null if token is undefined', () => {
      expect(getRoleFromToken(undefined)).toBeNull();
    });

    it('should return null if token has no role', () => {
      expect(getRoleFromToken({})).toBeNull();
    });

    it('should return the role if valid', () => {
      expect(getRoleFromToken({ role: 'dev' })).toBe('dev');
      expect(getRoleFromToken({ role: 'admin' })).toBe('admin');
      expect(getRoleFromToken({ role: 'member' })).toBe('member');
    });

    it('should return null for invalid roles', () => {
      expect(getRoleFromToken({ role: 'superadmin' })).toBeNull();
      expect(getRoleFromToken({ role: 'guest' })).toBeNull();
    });
  });

  describe('requireRole', () => {
    it('should return null if token is undefined', () => {
      expect(requireRole(undefined, ['admin'])).toBeNull();
    });

    it('should return null if user does not have minimum role', () => {
      expect(requireRole({ role: 'member' }, ['admin', 'dev'])).toBeNull();
    });

    it('should return the role if user has required role', () => {
      expect(requireRole({ role: 'admin' }, ['admin'])).toBe('admin');
      expect(requireRole({ role: 'dev' }, ['admin', 'dev'])).toBe('dev');
    });

    it('should allow hierarchy (dev can pass admin check)', () => {
      expect(requireRole({ role: 'dev' }, ['admin'])).toBe('dev');
    });

    it('should deny downgrade (admin cannot pass dev check)', () => {
      expect(requireRole({ role: 'admin' }, ['dev'])).toBeNull();
    });
  });
});
