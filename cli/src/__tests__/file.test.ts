/**
 * Tests for file utilities
 */

import { parseEmails } from '../utils/file';

describe('parseEmails', () => {
  test('parses single email per line', () => {
    const content = 'test1@gmail.com\ntest2@yahoo.com\ntest3@outlook.com';
    const emails = parseEmails(content);
    expect(emails).toEqual(['test1@gmail.com', 'test2@yahoo.com', 'test3@outlook.com']);
  });

  test('handles Windows line endings', () => {
    const content = 'test1@gmail.com\r\ntest2@yahoo.com\r\ntest3@outlook.com';
    const emails = parseEmails(content);
    expect(emails).toEqual(['test1@gmail.com', 'test2@yahoo.com', 'test3@outlook.com']);
  });

  test('skips empty lines', () => {
    const content = 'test1@gmail.com\n\ntest2@yahoo.com\n\n';
    const emails = parseEmails(content);
    expect(emails).toEqual(['test1@gmail.com', 'test2@yahoo.com']);
  });

  test('parses CSV format', () => {
    const content = 'name,email,other\nJohn,john@gmail.com,data\nJane,jane@yahoo.com,info';
    const emails = parseEmails(content);
    expect(emails).toContain('john@gmail.com');
    expect(emails).toContain('jane@yahoo.com');
  });

  test('handles quoted emails in CSV', () => {
    const content = '"John Doe","john@gmail.com","some data"';
    const emails = parseEmails(content);
    expect(emails).toContain('john@gmail.com');
  });

  test('handles semicolon delimiters', () => {
    const content = 'name;email;other\nJohn;john@gmail.com;data';
    const emails = parseEmails(content);
    expect(emails).toContain('john@gmail.com');
  });

  test('handles tab delimiters', () => {
    const content = 'name\temail\tother\nJohn\tjohn@gmail.com\tdata';
    const emails = parseEmails(content);
    expect(emails).toContain('john@gmail.com');
  });

  test('deduplicates emails', () => {
    const content = 'test@gmail.com\ntest@gmail.com\ntest@gmail.com';
    const emails = parseEmails(content);
    expect(emails).toEqual(['test@gmail.com']);
  });

  test('ignores lines without @', () => {
    const content = 'test@gmail.com\ninvalid-line\nanother@yahoo.com';
    const emails = parseEmails(content);
    expect(emails).toEqual(['test@gmail.com', 'another@yahoo.com']);
  });

  test('ignores very short strings', () => {
    const content = 'a@b\ntest@gmail.com';
    const emails = parseEmails(content);
    expect(emails).toEqual(['test@gmail.com']);
  });

  test('returns empty array for empty input', () => {
    const emails = parseEmails('');
    expect(emails).toEqual([]);
  });

  test('returns empty array for whitespace only', () => {
    const emails = parseEmails('   \n\n   ');
    expect(emails).toEqual([]);
  });
});
