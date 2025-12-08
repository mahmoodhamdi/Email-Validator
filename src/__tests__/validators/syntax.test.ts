import { validateSyntax, parseEmail } from '@/lib/validators/syntax';

describe('validateSyntax', () => {
  describe('valid emails', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+tag@example.com',
      'user123@test.co.uk',
      'a@b.cd',
      'test.email@subdomain.domain.com',
      'user_name@example.org',
      'user-name@example.net',
    ];

    test.each(validEmails)('should validate %s as valid', (email) => {
      const result = validateSyntax(email);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid emails', () => {
    test('should reject empty email', () => {
      const result = validateSyntax('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email address is required');
    });

    test('should reject email without @', () => {
      const result = validateSyntax('testexample.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email must contain an @ symbol');
    });

    test('should reject email without local part', () => {
      const result = validateSyntax('@example.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email must have a local part before @');
    });

    test('should reject email without domain', () => {
      const result = validateSyntax('test@');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email must have a domain after @');
    });

    test('should reject email without TLD', () => {
      const result = validateSyntax('test@example');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Domain must have a valid TLD');
    });

    test('should reject email with consecutive dots', () => {
      const result = validateSyntax('test..email@example.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Email cannot contain consecutive dots');
    });

    test('should reject local part starting with dot', () => {
      const result = validateSyntax('.test@example.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Local part cannot start or end with a dot');
    });

    test('should reject local part ending with dot', () => {
      const result = validateSyntax('test.@example.com');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Local part cannot start or end with a dot');
    });

    test('should reject email exceeding max length', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const result = validateSyntax(longEmail);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('exceeds maximum length');
    });

    test('should reject local part exceeding 64 characters', () => {
      const longLocal = 'a'.repeat(65) + '@example.com';
      const result = validateSyntax(longLocal);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Local part exceeds maximum length');
    });
  });

  describe('edge cases', () => {
    test('should trim whitespace', () => {
      const result = validateSyntax('  test@example.com  ');
      expect(result.valid).toBe(true);
    });
  });
});

describe('parseEmail', () => {
  test('should parse valid email', () => {
    const result = parseEmail('test@example.com');
    expect(result).toEqual({
      localPart: 'test',
      domain: 'example.com',
    });
  });

  test('should return lowercase domain', () => {
    const result = parseEmail('test@EXAMPLE.COM');
    expect(result?.domain).toBe('example.com');
  });

  test('should return null for invalid email', () => {
    const result = parseEmail('invalid-email');
    expect(result).toBeNull();
  });

  test('should handle multiple @ symbols', () => {
    const result = parseEmail('test@test@example.com');
    expect(result).toEqual({
      localPart: 'test@test',
      domain: 'example.com',
    });
  });
});
