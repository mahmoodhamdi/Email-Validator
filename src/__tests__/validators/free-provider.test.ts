import { validateFreeProvider } from '@/lib/validators/free-provider';

describe('validateFreeProvider', () => {
  describe('free providers', () => {
    const freeProviders = [
      { domain: 'gmail.com', provider: 'Gmail' },
      { domain: 'yahoo.com', provider: 'Yahoo' },
      { domain: 'outlook.com', provider: 'Outlook' },
      { domain: 'hotmail.com', provider: 'Hotmail' },
      { domain: 'icloud.com', provider: 'iCloud' },
      { domain: 'protonmail.com', provider: 'ProtonMail' },
      { domain: 'aol.com', provider: 'AOL' },
      { domain: 'live.com', provider: 'Live' },
      { domain: 'ymail.com', provider: 'Yahoo' },
    ];

    test.each(freeProviders)('should detect $domain as free provider ($provider)', ({ domain, provider }) => {
      const result = validateFreeProvider(domain);
      expect(result.isFree).toBe(true);
      expect(result.provider).toBe(provider);
    });
  });

  describe('business/custom domains', () => {
    const businessDomains = [
      'company.com',
      'business.org',
      'mysite.net',
      'university.edu',
      'government.gov',
    ];

    test.each(businessDomains)('should NOT detect %s as free provider', (domain) => {
      const result = validateFreeProvider(domain);
      expect(result.isFree).toBe(false);
      expect(result.provider).toBeNull();
    });
  });

  describe('international free providers', () => {
    const internationalProviders = [
      { domain: 'yahoo.co.uk', provider: 'Yahoo UK' },
      { domain: 'hotmail.co.uk', provider: 'Hotmail UK' },
      { domain: 'gmx.de', provider: 'GMX Germany' },
      { domain: 'web.de', provider: 'Web.de' },
      { domain: 'mail.ru', provider: 'Mail.ru' },
    ];

    test.each(internationalProviders)('should detect $domain as free provider', ({ domain, provider }) => {
      const result = validateFreeProvider(domain);
      expect(result.isFree).toBe(true);
      expect(result.provider).toBe(provider);
    });
  });

  describe('case insensitivity', () => {
    test('should detect uppercase domain', () => {
      const result = validateFreeProvider('GMAIL.COM');
      expect(result.isFree).toBe(true);
      expect(result.provider).toBe('Gmail');
    });

    test('should detect mixed case domain', () => {
      const result = validateFreeProvider('GmAiL.CoM');
      expect(result.isFree).toBe(true);
    });
  });
});
