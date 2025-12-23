import {
  sanitizeEmail,
  sanitizeEmailArray,
  escapeHtml,
  isNonEmptyString,
  isValidArray,
} from '@/lib/sanitize';
import { MAX_EMAIL_LENGTH, RATE_LIMITS } from '@/lib/constants';

describe('sanitizeEmail', () => {
  describe('basic sanitization', () => {
    test('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    test('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    test('should return empty string for non-string input', () => {
      expect(sanitizeEmail(null)).toBe('');
      expect(sanitizeEmail(undefined)).toBe('');
      expect(sanitizeEmail(123)).toBe('');
      expect(sanitizeEmail({})).toBe('');
      expect(sanitizeEmail([])).toBe('');
    });

    test('should handle empty string', () => {
      expect(sanitizeEmail('')).toBe('');
      expect(sanitizeEmail('   ')).toBe('');
    });
  });

  describe('XSS prevention', () => {
    test('should remove HTML tags', () => {
      expect(sanitizeEmail('<script>alert("xss")</script>test@example.com')).toBe(
        'alert("xss")test@example.com'
      );
      expect(sanitizeEmail('test@<b>example</b>.com')).toBe('test@example.com');
    });

    test('should remove javascript: protocol', () => {
      expect(sanitizeEmail('javascript:alert(1)@example.com')).toBe(
        'alert(1)@example.com'
      );
    });

    test('should remove data: protocol', () => {
      expect(sanitizeEmail('data:text/html,test@example.com')).toBe(
        'text/html,test@example.com'
      );
    });

    test('should remove vbscript: protocol', () => {
      expect(sanitizeEmail('vbscript:msgbox@example.com')).toBe(
        'msgbox@example.com'
      );
    });
  });

  describe('control characters', () => {
    test('should remove null bytes', () => {
      expect(sanitizeEmail('test\x00@example.com')).toBe('test@example.com');
    });

    test('should remove control characters', () => {
      expect(sanitizeEmail('test\x01\x02\x03@example.com')).toBe(
        'test@example.com'
      );
    });
  });

  describe('length limits', () => {
    test('should truncate emails exceeding max length', () => {
      const longLocal = 'a'.repeat(300);
      const result = sanitizeEmail(`${longLocal}@example.com`);

      expect(result.length).toBeLessThanOrEqual(MAX_EMAIL_LENGTH);
    });
  });
});

describe('sanitizeEmailArray', () => {
  describe('basic sanitization', () => {
    test('should sanitize each email', () => {
      const result = sanitizeEmailArray([
        '  TEST@EXAMPLE.COM  ',
        'user@domain.com',
      ]);

      expect(result.emails).toEqual(['test@example.com', 'user@domain.com']);
    });

    test('should return empty array for non-array input', () => {
      expect(sanitizeEmailArray(null)).toEqual({
        emails: [],
        duplicatesRemoved: 0,
        invalidRemoved: 0,
      });
      expect(sanitizeEmailArray('not an array')).toEqual({
        emails: [],
        duplicatesRemoved: 0,
        invalidRemoved: 0,
      });
    });
  });

  describe('duplicate removal', () => {
    test('should remove duplicate emails', () => {
      const result = sanitizeEmailArray([
        'test@example.com',
        'TEST@EXAMPLE.COM',
        'test@example.com',
      ]);

      expect(result.emails).toEqual(['test@example.com']);
      expect(result.duplicatesRemoved).toBe(2);
    });
  });

  describe('invalid email removal', () => {
    test('should remove empty strings', () => {
      const result = sanitizeEmailArray([
        '',
        'test@example.com',
        '   ',
      ]);

      expect(result.emails).toEqual(['test@example.com']);
      expect(result.invalidRemoved).toBe(2);
    });

    test('should remove emails without @', () => {
      const result = sanitizeEmailArray([
        'notanemail',
        'test@example.com',
      ]);

      expect(result.emails).toEqual(['test@example.com']);
      expect(result.invalidRemoved).toBe(1);
    });
  });

  describe('size limits', () => {
    test('should limit to max bulk size', () => {
      const emails = Array.from(
        { length: RATE_LIMITS.maxBulkSize + 100 },
        (_, i) => `test${i}@example.com`
      );

      const result = sanitizeEmailArray(emails);

      expect(result.emails.length).toBe(RATE_LIMITS.maxBulkSize);
    });

    test('should respect custom max size', () => {
      const emails = ['a@b.com', 'c@d.com', 'e@f.com', 'g@h.com'];
      const result = sanitizeEmailArray(emails, 2);

      expect(result.emails.length).toBe(2);
    });
  });

  describe('metadata', () => {
    test('should return correct metadata', () => {
      const result = sanitizeEmailArray([
        'test@example.com',
        'test@example.com', // duplicate
        '', // invalid
        'notanemail', // invalid
        'user@domain.com',
      ]);

      expect(result.emails).toEqual(['test@example.com', 'user@domain.com']);
      expect(result.duplicatesRemoved).toBe(1);
      expect(result.invalidRemoved).toBe(2);
    });
  });
});

describe('escapeHtml', () => {
  test('should escape HTML special characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
    expect(escapeHtml("'apostrophe'")).toBe('&#x27;apostrophe&#x27;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('path/to/file')).toBe('path&#x2F;to&#x2F;file');
  });

  test('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('should handle string without special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('isNonEmptyString', () => {
  test('should return true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('a')).toBe(true);
  });

  test('should return false for empty strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  test('should return false for non-strings', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
  });
});

describe('isValidArray', () => {
  test('should return true for non-empty arrays', () => {
    expect(isValidArray([1])).toBe(true);
    expect(isValidArray([1, 2, 3])).toBe(true);
    expect(isValidArray(['a', 'b'])).toBe(true);
  });

  test('should return false for empty arrays', () => {
    expect(isValidArray([])).toBe(false);
  });

  test('should return false for non-arrays', () => {
    expect(isValidArray(null)).toBe(false);
    expect(isValidArray(undefined)).toBe(false);
    expect(isValidArray('string')).toBe(false);
    expect(isValidArray(123)).toBe(false);
    expect(isValidArray({})).toBe(false);
  });
});
