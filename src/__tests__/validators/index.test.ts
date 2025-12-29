import { validateEmail, validateEmailBulk } from '@/lib/validators';

// Mock fetch for MX record lookup
global.fetch = jest.fn();

describe('validateEmail', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        Status: 0,
        Answer: [
          { type: 15, data: '10 mx1.example.com.' },
          { type: 15, data: '20 mx2.example.com.' },
        ],
      }),
    });
  });

  describe('valid emails', () => {
    test('should validate a standard email', async () => {
      const result = await validateEmail('test@example.com');

      expect(result.email).toBe('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.checks.syntax.valid).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    test('should validate Gmail email', async () => {
      const result = await validateEmail('user@gmail.com');

      expect(result.checks.syntax.valid).toBe(true);
      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.freeProvider.provider).toBe('Gmail');
    });
  });

  describe('invalid emails', () => {
    test('should reject email with invalid syntax', async () => {
      const result = await validateEmail('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.checks.syntax.valid).toBe(false);
      expect(result.deliverability).toBe('undeliverable');
      expect(result.risk).toBe('high');
    });

    test('should reject empty email', async () => {
      const result = await validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.message).toBe('Email address is required');
    });
  });

  describe('disposable emails', () => {
    test('should detect disposable email', async () => {
      const result = await validateEmail('test@mailinator.com');

      expect(result.checks.disposable.isDisposable).toBe(true);
      expect(result.deliverability).toBe('risky');
    });
  });

  describe('role-based emails', () => {
    test('should detect role-based email', async () => {
      const result = await validateEmail('admin@example.com');

      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('admin');
    });

    test('should detect support role', async () => {
      const result = await validateEmail('support@company.com');

      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('support');
    });
  });

  describe('typo detection', () => {
    test('should detect typo in domain', async () => {
      const result = await validateEmail('user@gmial.com');

      expect(result.checks.typo.hasTypo).toBe(true);
      expect(result.checks.typo.suggestion).toBe('gmail.com');
    });

    test('should NOT detect typo for correct gmail.com', async () => {
      const result = await validateEmail('user@gmail.com');

      expect(result.checks.typo.hasTypo).toBe(false);
    });
  });

  describe('MX record validation', () => {
    test('should validate MX records', async () => {
      const result = await validateEmail('test@example.com');

      expect(result.checks.mx.valid).toBe(true);
      expect(result.checks.mx.records.length).toBeGreaterThan(0);
    });

    test('should handle missing MX records', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Status: 3, // NXDOMAIN
          Answer: [],
        }),
      });

      const result = await validateEmail('test@nonexistent-domain-xyz.com');

      expect(result.checks.mx.valid).toBe(false);
    });
  });

  describe('score calculation', () => {
    test('should have positive score for valid syntax email', async () => {
      const result = await validateEmail('john.doe@example.com');

      expect(result.score).toBeGreaterThan(0);
    });

    test('should have lower score for disposable email', async () => {
      const result = await validateEmail('test@mailinator.com');
      const validResult = await validateEmail('test@example.com');

      expect(result.score).toBeLessThanOrEqual(validResult.score);
    });
  });

  describe('deliverability status', () => {
    test('should mark valid email as deliverable', async () => {
      const result = await validateEmail('user@example.com');

      expect(result.deliverability).toBe('deliverable');
    });

    test('should mark disposable as risky', async () => {
      const result = await validateEmail('test@tempmail.com');

      expect(result.deliverability).toBe('risky');
    });

    test('should mark invalid syntax as undeliverable', async () => {
      const result = await validateEmail('invalid');

      expect(result.deliverability).toBe('undeliverable');
    });
  });

  describe('risk level', () => {
    test('should have risk level set', async () => {
      const result = await validateEmail('user@example.com');

      expect(['low', 'medium', 'high']).toContain(result.risk);
    });

    test('should have high risk for invalid email', async () => {
      const result = await validateEmail('invalid-email');

      expect(result.risk).toBe('high');
    });
  });
});

describe('validateEmailBulk', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        Status: 0,
        Answer: [{ type: 15, data: '10 mx1.example.com.' }],
      }),
    });
  });

  test('should validate multiple emails', async () => {
    const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
    const bulkResult = await validateEmailBulk(emails);

    expect(bulkResult.results.length).toBe(3);
    expect(bulkResult.metadata.total).toBe(3);
    expect(bulkResult.metadata.completed).toBe(3);
    bulkResult.results.forEach((result, index) => {
      expect(result.email).toBe(emails[index]);
    });
  });

  test('should handle empty array', async () => {
    const bulkResult = await validateEmailBulk([]);

    expect(bulkResult.results).toEqual([]);
    expect(bulkResult.metadata.total).toBe(0);
    expect(bulkResult.metadata.completed).toBe(0);
  });

  test('should handle mixed valid and invalid emails', async () => {
    const emails = ['valid@example.com', 'invalid-email', 'test@example.com'];
    const bulkResult = await validateEmailBulk(emails);

    expect(bulkResult.results[0].checks.syntax.valid).toBe(true);
    expect(bulkResult.results[1].checks.syntax.valid).toBe(false);
    expect(bulkResult.results[2].checks.syntax.valid).toBe(true);
  });

  test('should return metadata with processing info', async () => {
    const emails = ['test@example.com'];
    const bulkResult = await validateEmailBulk(emails);

    expect(bulkResult.metadata).toBeDefined();
    expect(bulkResult.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(bulkResult.metadata.timedOut).toBe(false);
  });
});
