import { validateRoleBased } from '@/lib/validators/role-based';

describe('validateRoleBased', () => {
  describe('role-based prefixes', () => {
    const roleBasedPrefixes = [
      'admin',
      'support',
      'info',
      'contact',
      'sales',
      'help',
      'billing',
      'marketing',
      'hr',
      'jobs',
      'careers',
      'media',
      'abuse',
      'postmaster',
      'webmaster',
      'hostmaster',
      'security',
    ];

    test.each(roleBasedPrefixes)('should detect %s as role-based', (prefix) => {
      const result = validateRoleBased(prefix);
      expect(result.isRoleBased).toBe(true);
      expect(result.role).toBeDefined();
    });
  });

  describe('specific role detection', () => {
    test('should detect admin role', () => {
      const result = validateRoleBased('admin');
      expect(result.isRoleBased).toBe(true);
      expect(result.role).toBe('admin');
    });

    test('should detect support role', () => {
      const result = validateRoleBased('support');
      expect(result.isRoleBased).toBe(true);
      expect(result.role).toBe('support');
    });

    test('should detect info role', () => {
      const result = validateRoleBased('info');
      expect(result.isRoleBased).toBe(true);
      expect(result.role).toBe('info');
    });
  });

  describe('personal emails', () => {
    const personalPrefixes = [
      'john',
      'jane.doe',
      'user123',
      'firstname.lastname',
      'j.smith',
      'alex',
      'michael',
    ];

    test.each(personalPrefixes)('should NOT detect %s as role-based', (prefix) => {
      const result = validateRoleBased(prefix);
      expect(result.isRoleBased).toBe(false);
      expect(result.role).toBeNull();
    });
  });

  describe('role-based with variations', () => {
    test('should detect role with numbers', () => {
      const result = validateRoleBased('admin1');
      expect(result.isRoleBased).toBe(true);
    });

    test('should detect role with underscore separator', () => {
      const result = validateRoleBased('admin_team');
      expect(result.isRoleBased).toBe(true);
    });

    test('should detect role with dot separator', () => {
      const result = validateRoleBased('admin.team');
      expect(result.isRoleBased).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    test('should detect uppercase role', () => {
      const result = validateRoleBased('ADMIN');
      expect(result.isRoleBased).toBe(true);
    });

    test('should detect mixed case role', () => {
      const result = validateRoleBased('SuPpOrT');
      expect(result.isRoleBased).toBe(true);
    });
  });
});
