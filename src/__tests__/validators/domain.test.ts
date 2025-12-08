import { validateDomain, isValidDomainFormat } from '@/lib/validators/domain';

describe('validateDomain', () => {
  describe('valid domains', () => {
    const validDomains = [
      'example.com',
      'test.co.uk',
      'subdomain.example.org',
      'my-site.net',
      'site123.com',
    ];

    test.each(validDomains)('should validate %s as valid', async (domain) => {
      const result = await validateDomain(domain);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid domains', () => {
    test('should reject empty domain', async () => {
      const result = await validateDomain('');
      expect(result.valid).toBe(false);
    });

    test('should reject domain without TLD', async () => {
      const result = await validateDomain('example');
      expect(result.valid).toBe(false);
    });

    test('should reject domain with invalid characters', async () => {
      const result = await validateDomain('exam ple.com');
      expect(result.valid).toBe(false);
    });

    test('should reject domain with single char TLD', async () => {
      const result = await validateDomain('example.c');
      expect(result.valid).toBe(false);
    });

    test('should reject domain starting with hyphen', async () => {
      const result = await validateDomain('-example.com');
      expect(result.valid).toBe(false);
    });
  });
});

describe('isValidDomainFormat', () => {
  test('should return true for valid domain', () => {
    expect(isValidDomainFormat('example.com')).toBe(true);
  });

  test('should return false for invalid domain', () => {
    expect(isValidDomainFormat('invalid')).toBe(false);
  });

  test('should handle subdomains', () => {
    expect(isValidDomainFormat('sub.example.com')).toBe(true);
  });

  test('should handle multi-level TLDs', () => {
    expect(isValidDomainFormat('example.co.uk')).toBe(true);
  });
});
