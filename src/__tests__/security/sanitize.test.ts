/**
 * @jest-environment node
 */
import {
  sanitizeEmail,
  sanitizeEmailArray,
  sanitizeTextContent,
  parseEmailsFromText,
  sanitizeFilename,
  escapeHtml,
  isNonEmptyString,
  isValidArray,
  isValidContentType,
  isWithinSizeLimit,
} from '@/lib/sanitize';
import { INPUT_LIMITS, RATE_LIMITS } from '@/lib/constants';

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

    test('should return empty for too short emails', () => {
      expect(sanitizeEmail('a@b')).toBe(''); // Less than 5 chars
      expect(sanitizeEmail('a@b.c')).toBe('a@b.c'); // Exactly 5 chars
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

    test('should remove event handlers', () => {
      expect(sanitizeEmail('test@example.com onclick=alert(1)')).toBe(
        'test@example.com alert(1)'
      );
    });

    test('should remove file: protocol', () => {
      expect(sanitizeEmail('file://test@example.com')).toBe(
        '//test@example.com'
      );
    });

    test('should remove expression()', () => {
      expect(sanitizeEmail('expression(alert(1))@example.com')).toBe(
        'alert(1))@example.com'
      );
    });

    test('should handle javascript with spaces', () => {
      expect(sanitizeEmail('java script :alert@example.com')).toBe(
        'java script :alert@example.com'
      );
      expect(sanitizeEmail('javascript : alert@example.com')).toBe(
        'alert@example.com'
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

      expect(result.length).toBeLessThanOrEqual(INPUT_LIMITS.maxEmailLength);
    });
  });

  describe('unicode normalization', () => {
    test('should normalize unicode characters', () => {
      // Composed vs decomposed forms
      const composed = 'café@example.com';
      const decomposed = 'cafe\u0301@example.com';
      expect(sanitizeEmail(composed)).toBe(sanitizeEmail(decomposed));
    });
  });
});

describe('sanitizeTextContent', () => {
  test('should sanitize text content', () => {
    const text = 'test@example.com\nuser@domain.com';
    const result = sanitizeTextContent(text);
    expect(result).toBe('test@example.com\nuser@domain.com');
  });

  test('should remove dangerous patterns', () => {
    const text = '<script>alert(1)</script>test@example.com';
    const result = sanitizeTextContent(text);
    expect(result).toBe('alert(1)test@example.com');
  });

  test('should preserve newlines', () => {
    const text = 'line1@example.com\nline2@example.com\nline3@example.com';
    const result = sanitizeTextContent(text);
    expect(result).toContain('\n');
    expect(result?.split('\n').length).toBe(3);
  });

  test('should return null for non-string input', () => {
    expect(sanitizeTextContent(null)).toBe(null);
    expect(sanitizeTextContent(undefined)).toBe(null);
    expect(sanitizeTextContent(123)).toBe(null);
  });

  test('should return null if text exceeds size limit', () => {
    const largeText = 'a'.repeat(INPUT_LIMITS.maxTextareaSize + 100);
    expect(sanitizeTextContent(largeText)).toBe(null);
  });

  test('should respect custom max size', () => {
    const text = 'a'.repeat(1000);
    expect(sanitizeTextContent(text, 500)).toBe(null);
    expect(sanitizeTextContent(text, 2000)).not.toBe(null);
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

    test('should remove emails without domain dot', () => {
      const result = sanitizeEmailArray([
        'user@nodot',
        'test@example.com',
      ]);

      expect(result.emails).toEqual(['test@example.com']);
      expect(result.invalidRemoved).toBe(1);
    });

    test('should remove emails with too long local part', () => {
      const longLocal = 'a'.repeat(65) + '@example.com';
      const result = sanitizeEmailArray([longLocal, 'test@example.com']);

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

describe('parseEmailsFromText', () => {
  test('should parse newline-separated emails', () => {
    const text = 'test1@example.com\ntest2@example.com\ntest3@example.com';
    const result = parseEmailsFromText(text);
    expect(result).toEqual([
      'test1@example.com',
      'test2@example.com',
      'test3@example.com',
    ]);
  });

  test('should parse comma-separated emails', () => {
    const text = 'test1@example.com, test2@example.com, test3@example.com';
    const result = parseEmailsFromText(text);
    expect(result).toEqual([
      'test1@example.com',
      'test2@example.com',
      'test3@example.com',
    ]);
  });

  test('should parse semicolon-separated emails', () => {
    const text = 'test1@example.com; test2@example.com; test3@example.com';
    const result = parseEmailsFromText(text);
    expect(result).toEqual([
      'test1@example.com',
      'test2@example.com',
      'test3@example.com',
    ]);
  });

  test('should handle mixed delimiters', () => {
    const text = 'test1@example.com\ntest2@example.com, test3@example.com';
    const result = parseEmailsFromText(text);
    expect(result).toHaveLength(3);
  });

  test('should extract email from Name <email> format', () => {
    const text = 'John Doe <john@example.com>\nJane <jane@example.com>';
    const result = parseEmailsFromText(text);
    expect(result).toEqual(['john@example.com', 'jane@example.com']);
  });

  test('should extract email from email (name) format', () => {
    const text = 'john@example.com (John Doe)';
    const result = parseEmailsFromText(text);
    expect(result).toEqual(['john@example.com']);
  });

  test('should skip invalid entries', () => {
    const text = 'valid@example.com\ninvalid\n\n   \nother@example.com';
    const result = parseEmailsFromText(text);
    expect(result).toEqual(['valid@example.com', 'other@example.com']);
  });

  test('should respect max emails limit', () => {
    const emails = Array.from({ length: 100 }, (_, i) => `test${i}@example.com`);
    const text = emails.join('\n');
    const result = parseEmailsFromText(text, 10);
    expect(result).toHaveLength(10);
  });

  test('should handle empty input', () => {
    expect(parseEmailsFromText('')).toEqual([]);
    expect(parseEmailsFromText(null as unknown as string)).toEqual([]);
  });

  test('should convert emails to lowercase', () => {
    const text = 'TEST@EXAMPLE.COM';
    const result = parseEmailsFromText(text);
    expect(result).toEqual(['test@example.com']);
  });
});

describe('sanitizeFilename', () => {
  test('should keep valid filenames', () => {
    expect(sanitizeFilename('document.txt')).toBe('document.txt');
    expect(sanitizeFilename('my-file_v2.pdf')).toBe('my-file_v2.pdf');
  });

  test('should remove path traversal attempts', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32');
  });

  test('should remove slashes', () => {
    expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt');
    expect(sanitizeFilename('path\\to\\file.txt')).toBe('pathtofile.txt');
  });

  test('should replace invalid characters with underscore', () => {
    expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
    expect(sanitizeFilename('file:name.txt')).toBe('file_name.txt');
  });

  test('should handle hidden files', () => {
    expect(sanitizeFilename('.htaccess')).toBe('_htaccess');
    expect(sanitizeFilename('.env')).toBe('_env');
  });

  test('should remove null bytes', () => {
    expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
  });

  test('should handle non-string input', () => {
    expect(sanitizeFilename(null)).toBe('file');
    expect(sanitizeFilename(undefined)).toBe('file');
    expect(sanitizeFilename(123)).toBe('file');
  });

  test('should handle invalid filenames', () => {
    expect(sanitizeFilename('')).toBe('file');
    expect(sanitizeFilename('.')).toBe('file');
    expect(sanitizeFilename('..')).toBe('file');
  });

  test('should limit filename length', () => {
    const longName = 'a'.repeat(300) + '.txt';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result.endsWith('.txt')).toBe(true);
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

  test('should escape backticks and equals', () => {
    expect(escapeHtml('`code`')).toBe('&#x60;code&#x60;');
    expect(escapeHtml('a=b')).toBe('a&#x3D;b');
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

describe('isValidContentType', () => {
  test('should validate single content type', () => {
    expect(isValidContentType('application/json', 'application/json')).toBe(true);
    expect(isValidContentType('text/html', 'application/json')).toBe(false);
  });

  test('should validate against array of content types', () => {
    const allowed = ['application/json', 'text/plain'];
    expect(isValidContentType('application/json', allowed)).toBe(true);
    expect(isValidContentType('text/plain', allowed)).toBe(true);
    expect(isValidContentType('text/html', allowed)).toBe(false);
  });

  test('should ignore charset and other params', () => {
    expect(isValidContentType('application/json; charset=utf-8', 'application/json')).toBe(true);
    expect(isValidContentType('text/html; charset=utf-8', 'application/json')).toBe(false);
  });

  test('should be case insensitive', () => {
    expect(isValidContentType('APPLICATION/JSON', 'application/json')).toBe(true);
    expect(isValidContentType('application/json', 'APPLICATION/JSON')).toBe(true);
  });

  test('should return false for null/undefined', () => {
    expect(isValidContentType(null, 'application/json')).toBe(false);
    expect(isValidContentType(undefined as unknown as string, 'application/json')).toBe(false);
  });
});

describe('isWithinSizeLimit', () => {
  test('should return true for valid sizes', () => {
    expect(isWithinSizeLimit('1000', 2000)).toBe(true);
    expect(isWithinSizeLimit('0', 100)).toBe(true);
  });

  test('should return false for sizes exceeding limit', () => {
    expect(isWithinSizeLimit('3000', 2000)).toBe(false);
    // maxRequestBodySize is 1MB (1,048,576 bytes), so use a larger value
    expect(isWithinSizeLimit(String(INPUT_LIMITS.maxRequestBodySize + 100), INPUT_LIMITS.maxRequestBodySize)).toBe(false);
  });

  test('should return true for null content-length', () => {
    // No Content-Length means we validate when reading
    expect(isWithinSizeLimit(null)).toBe(true);
  });

  test('should return false for invalid content-length', () => {
    expect(isWithinSizeLimit('not-a-number')).toBe(false);
    expect(isWithinSizeLimit('abc')).toBe(false);
  });

  test('should use default max size', () => {
    const justUnder = String(INPUT_LIMITS.maxRequestBodySize - 1);
    const justOver = String(INPUT_LIMITS.maxRequestBodySize + 1);
    expect(isWithinSizeLimit(justUnder)).toBe(true);
    expect(isWithinSizeLimit(justOver)).toBe(false);
  });
});
