import { validateTypo, suggestCorrection } from '@/lib/validators/typo';

describe('validateTypo', () => {
  describe('Gmail typos', () => {
    const gmailTypos = [
      'gmial.com',
      'gmal.com',
      'gmai.com',
      'gamil.com',
      'gnail.com',
      'gmaill.com',
      'gmail.co',
      'gmail.cm',
    ];

    test.each(gmailTypos)('should detect %s as typo and suggest gmail.com', (domain) => {
      const result = validateTypo(domain);
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe('gmail.com');
    });
  });

  describe('Yahoo typos', () => {
    const yahooTypos = [
      'yaho.com',
      'yahooo.com',
      'yahoo.co',
      'yhaoo.com',
    ];

    test.each(yahooTypos)('should detect %s as typo and suggest yahoo.com', (domain) => {
      const result = validateTypo(domain);
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe('yahoo.com');
    });
  });

  describe('Hotmail typos', () => {
    const hotmailTypos = [
      'hotmal.com',
      'hotmial.com',
      'hotmai.com',
      'hotmail.co',
    ];

    test.each(hotmailTypos)('should detect %s as typo and suggest hotmail.com', (domain) => {
      const result = validateTypo(domain);
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe('hotmail.com');
    });
  });

  describe('Outlook typos', () => {
    const outlookTypos = [
      'outlok.com',
      'outloo.com',
      'outlook.co',
    ];

    test.each(outlookTypos)('should detect %s as typo and suggest outlook.com', (domain) => {
      const result = validateTypo(domain);
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe('outlook.com');
    });
  });

  describe('correct domains', () => {
    const correctDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'protonmail.com',
      'live.com',
      'ymail.com',
    ];

    test.each(correctDomains)('should NOT detect %s as typo', (domain) => {
      const result = validateTypo(domain);
      expect(result.hasTypo).toBe(false);
      expect(result.suggestion).toBeNull();
    });
  });

  describe('case insensitivity', () => {
    test('should detect uppercase typo', () => {
      const result = validateTypo('GMIAL.COM');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestion).toBe('gmail.com');
    });
  });
});

describe('suggestCorrection', () => {
  test('should return corrected email for typo', () => {
    const result = suggestCorrection('test@gmial.com');
    expect(result).toBe('test@gmail.com');
  });

  test('should return null for correct domain', () => {
    const result = suggestCorrection('test@gmail.com');
    expect(result).toBeNull();
  });

  test('should return null for invalid email', () => {
    const result = suggestCorrection('invalid-email');
    expect(result).toBeNull();
  });

  test('should preserve local part', () => {
    const result = suggestCorrection('john.doe+tag@gmial.com');
    expect(result).toBe('john.doe+tag@gmail.com');
  });
});
