/**
 * Tests for Custom Blacklist module
 */

import {
  checkAgainstBlacklist,
  validatePattern,
  parsePatterns,
} from '@/lib/blacklist';
import type { Blacklist, BlacklistEntry } from '@/lib/blacklist/types';
import { checkCustomBlacklist } from '@/lib/validators/custom-blacklist';

describe('Custom Blacklist Module', () => {
  // Helper to create a blacklist
  const createBlacklist = (entries: Partial<BlacklistEntry>[]): Blacklist => ({
    id: 'test-blacklist',
    name: 'Test Blacklist',
    entries: entries.map((e, i) => ({
      id: `entry-${i}`,
      pattern: e.pattern || '',
      type: e.type || 'domain',
      createdAt: new Date(),
      isActive: e.isActive !== false,
      ...e,
    })),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('checkAgainstBlacklist', () => {
    describe('domain matching', () => {
      it('should match exact domain', () => {
        const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const result = checkAgainstBlacklist('user@spam.com', [blacklist]);

        expect(result.isBlacklisted).toBe(true);
        expect(result.matchedEntries).toHaveLength(1);
        expect(result.matchedEntries[0].pattern).toBe('spam.com');
      });

      it('should match subdomain', () => {
        const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const result = checkAgainstBlacklist('user@mail.spam.com', [blacklist]);

        expect(result.isBlacklisted).toBe(true);
      });

      it('should match deeply nested subdomain', () => {
        const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const result = checkAgainstBlacklist('user@a.b.c.spam.com', [blacklist]);

        expect(result.isBlacklisted).toBe(true);
      });

      it('should not match partial domain names', () => {
        const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const result = checkAgainstBlacklist('user@notspam.com', [blacklist]);

        expect(result.isBlacklisted).toBe(false);
      });

      it('should not match different domain', () => {
        const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const result = checkAgainstBlacklist('user@gmail.com', [blacklist]);

        expect(result.isBlacklisted).toBe(false);
      });
    });

    describe('email matching', () => {
      it('should match exact email', () => {
        const blacklist = createBlacklist([{ pattern: 'bad@example.com', type: 'email' }]);
        const result = checkAgainstBlacklist('bad@example.com', [blacklist]);

        expect(result.isBlacklisted).toBe(true);
      });

      it('should not match different email at same domain', () => {
        const blacklist = createBlacklist([{ pattern: 'bad@example.com', type: 'email' }]);
        const result = checkAgainstBlacklist('good@example.com', [blacklist]);

        expect(result.isBlacklisted).toBe(false);
      });

      it('should be case insensitive', () => {
        const blacklist = createBlacklist([{ pattern: 'BAD@EXAMPLE.COM', type: 'email' }]);
        const result = checkAgainstBlacklist('bad@example.com', [blacklist]);

        expect(result.isBlacklisted).toBe(true);
      });
    });

    describe('pattern matching (wildcards)', () => {
      it('should match * for any characters', () => {
        const blacklist = createBlacklist([{ pattern: '*@tempmail.com', type: 'pattern' }]);

        expect(checkAgainstBlacklist('anything@tempmail.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user123@tempmail.com', [blacklist]).isBlacklisted).toBe(true);
      });

      it('should match * in domain', () => {
        const blacklist = createBlacklist([{ pattern: '*@temp*.com', type: 'pattern' }]);

        expect(checkAgainstBlacklist('user@tempmail.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user@temporary.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user@gmail.com', [blacklist]).isBlacklisted).toBe(false);
      });

      it('should match ? for single character', () => {
        const blacklist = createBlacklist([{ pattern: 'user?@example.com', type: 'pattern' }]);

        expect(checkAgainstBlacklist('user1@example.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('usera@example.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user12@example.com', [blacklist]).isBlacklisted).toBe(false);
        expect(checkAgainstBlacklist('user@example.com', [blacklist]).isBlacklisted).toBe(false);
      });

      it('should match domain-only patterns', () => {
        const blacklist = createBlacklist([{ pattern: 'temp*.com', type: 'pattern' }]);

        expect(checkAgainstBlacklist('user@tempmail.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user@temporary.com', [blacklist]).isBlacklisted).toBe(true);
      });

      it('should escape regex special characters', () => {
        const blacklist = createBlacklist([{ pattern: 'test+tag@example.com', type: 'pattern' }]);

        expect(checkAgainstBlacklist('test+tag@example.com', [blacklist]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('testtag@example.com', [blacklist]).isBlacklisted).toBe(false);
      });
    });

    describe('active/inactive entries', () => {
      it('should ignore inactive entries', () => {
        const blacklist = createBlacklist([
          { pattern: 'spam.com', type: 'domain', isActive: false },
        ]);
        const result = checkAgainstBlacklist('user@spam.com', [blacklist]);

        expect(result.isBlacklisted).toBe(false);
      });

      it('should match active entries only', () => {
        const blacklist = createBlacklist([
          { pattern: 'spam.com', type: 'domain', isActive: false },
          { pattern: 'bad.com', type: 'domain', isActive: true },
        ]);

        expect(checkAgainstBlacklist('user@spam.com', [blacklist]).isBlacklisted).toBe(false);
        expect(checkAgainstBlacklist('user@bad.com', [blacklist]).isBlacklisted).toBe(true);
      });
    });

    describe('multiple blacklists', () => {
      it('should check against multiple blacklists', () => {
        const blacklist1 = createBlacklist([{ pattern: 'spam1.com', type: 'domain' }]);
        const blacklist2 = createBlacklist([{ pattern: 'spam2.com', type: 'domain' }]);

        expect(checkAgainstBlacklist('user@spam1.com', [blacklist1, blacklist2]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user@spam2.com', [blacklist1, blacklist2]).isBlacklisted).toBe(true);
        expect(checkAgainstBlacklist('user@clean.com', [blacklist1, blacklist2]).isBlacklisted).toBe(false);
      });

      it('should return all matched entries', () => {
        const blacklist1 = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const blacklist2 = createBlacklist([{ pattern: '*@*.spam.com', type: 'pattern' }]);

        const result = checkAgainstBlacklist('user@mail.spam.com', [blacklist1, blacklist2]);

        expect(result.isBlacklisted).toBe(true);
        expect(result.matchedEntries.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('edge cases', () => {
      it('should handle empty blacklists', () => {
        const result = checkAgainstBlacklist('user@example.com', []);

        expect(result.isBlacklisted).toBe(false);
        expect(result.matchedEntries).toHaveLength(0);
      });

      it('should handle blacklist with no entries', () => {
        const blacklist = createBlacklist([]);
        const result = checkAgainstBlacklist('user@example.com', [blacklist]);

        expect(result.isBlacklisted).toBe(false);
      });

      it('should handle invalid email format', () => {
        const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
        const result = checkAgainstBlacklist('invalid-email', [blacklist]);

        expect(result.isBlacklisted).toBe(false);
        expect(result.message).toBe('Invalid email format');
      });
    });
  });

  describe('validatePattern', () => {
    describe('domain patterns', () => {
      it('should accept valid domain', () => {
        expect(validatePattern('example.com', 'domain').valid).toBe(true);
        expect(validatePattern('sub.example.com', 'domain').valid).toBe(true);
        expect(validatePattern('a-b.example.com', 'domain').valid).toBe(true);
      });

      it('should reject domain with @', () => {
        const result = validatePattern('user@example.com', 'domain');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('@');
      });

      it('should reject empty pattern', () => {
        const result = validatePattern('', 'domain');
        expect(result.valid).toBe(false);
      });

      it('should reject invalid domain format', () => {
        expect(validatePattern('-invalid.com', 'domain').valid).toBe(false);
        expect(validatePattern('invalid-.com', 'domain').valid).toBe(false);
      });
    });

    describe('email patterns', () => {
      it('should accept valid email', () => {
        expect(validatePattern('user@example.com', 'email').valid).toBe(true);
      });

      it('should reject email without @', () => {
        const result = validatePattern('example.com', 'email');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('@');
      });

      it('should reject email with multiple @', () => {
        const result = validatePattern('user@test@example.com', 'email');
        expect(result.valid).toBe(false);
      });
    });

    describe('wildcard patterns', () => {
      it('should accept valid patterns', () => {
        expect(validatePattern('*.com', 'pattern').valid).toBe(true);
        expect(validatePattern('spam*', 'pattern').valid).toBe(true);
        expect(validatePattern('*@temp*.com', 'pattern').valid).toBe(true);
      });

      it('should reject too short patterns', () => {
        const result = validatePattern('a', 'pattern');
        expect(result.valid).toBe(false);
      });

      it('should reject patterns with only wildcards', () => {
        expect(validatePattern('*', 'pattern').valid).toBe(false);
        expect(validatePattern('**', 'pattern').valid).toBe(false);
        expect(validatePattern('?*', 'pattern').valid).toBe(false);
      });
    });
  });

  describe('parsePatterns', () => {
    it('should parse newline-separated patterns', () => {
      const input = 'spam.com\nbad.com\ntest.com';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com', 'test.com']);
    });

    it('should parse comma-separated patterns', () => {
      const input = 'spam.com,bad.com,test.com';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com', 'test.com']);
    });

    it('should parse semicolon-separated patterns', () => {
      const input = 'spam.com;bad.com;test.com';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com', 'test.com']);
    });

    it('should trim whitespace', () => {
      const input = '  spam.com  \n  bad.com  ';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com']);
    });

    it('should filter empty lines', () => {
      const input = 'spam.com\n\n\nbad.com';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com']);
    });

    it('should ignore comments', () => {
      const input = '# This is a comment\nspam.com\n# Another comment\nbad.com';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com']);
    });

    it('should lowercase patterns', () => {
      const input = 'SPAM.COM\nBaD.CoM';
      const result = parsePatterns(input);

      expect(result).toEqual(['spam.com', 'bad.com']);
    });
  });

  describe('checkCustomBlacklist (validator wrapper)', () => {
    it('should return disabled message when disabled', () => {
      const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
      const result = checkCustomBlacklist('user@spam.com', [blacklist], { enabled: false });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('Custom blacklist check disabled');
    });

    it('should return no blacklists message when empty', () => {
      const result = checkCustomBlacklist('user@example.com', [], { enabled: true });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('No custom blacklists configured');
    });

    it('should return no email message when email is empty', () => {
      const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
      const result = checkCustomBlacklist('', [blacklist], { enabled: true });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('No email provided');
    });

    it('should check blacklist when enabled', () => {
      const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
      const result = checkCustomBlacklist('user@spam.com', [blacklist], { enabled: true });

      expect(result.checked).toBe(true);
      expect(result.result?.isBlacklisted).toBe(true);
    });

    it('should use default enabled option', () => {
      const blacklist = createBlacklist([{ pattern: 'spam.com', type: 'domain' }]);
      const result = checkCustomBlacklist('user@spam.com', [blacklist]);

      expect(result.checked).toBe(true);
    });
  });
});
