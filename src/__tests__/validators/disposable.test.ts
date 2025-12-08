import { validateDisposable } from '@/lib/validators/disposable';

describe('validateDisposable', () => {
  describe('disposable domains', () => {
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email',
      'fakeinbox.com',
      'trashmail.com',
    ];

    test.each(disposableDomains)('should detect %s as disposable', (domain) => {
      const result = validateDisposable(domain);
      expect(result.isDisposable).toBe(true);
    });
  });

  describe('legitimate domains', () => {
    const legitimateDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'company.com',
      'university.edu',
    ];

    test.each(legitimateDomains)('should NOT detect %s as disposable', (domain) => {
      const result = validateDisposable(domain);
      expect(result.isDisposable).toBe(false);
    });
  });

  describe('pattern detection', () => {
    test('should detect domains matching disposable patterns', () => {
      const patternDomains = [
        'tempmail-service.com',
        'fakeemail-test.org',
        'trashmail-provider.net',
        'spambox-free.com',
      ];

      patternDomains.forEach(domain => {
        const result = validateDisposable(domain);
        expect(result.isDisposable).toBe(true);
      });
    });
  });

  describe('subdomain handling', () => {
    test('should detect subdomain of disposable domain', () => {
      const result = validateDisposable('sub.mailinator.com');
      expect(result.isDisposable).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    test('should handle uppercase domains', () => {
      const result = validateDisposable('MAILINATOR.COM');
      expect(result.isDisposable).toBe(true);
    });

    test('should handle mixed case domains', () => {
      const result = validateDisposable('TempMail.Com');
      expect(result.isDisposable).toBe(true);
    });
  });
});
