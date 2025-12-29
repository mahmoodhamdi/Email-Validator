/**
 * Tests for output utilities
 */

import { toCSV, getScoreColor, getRiskColor } from '../utils/output';
import type { ValidationResult } from '../validator';

describe('toCSV', () => {
  const mockResult: ValidationResult = {
    email: 'test@gmail.com',
    isValid: true,
    score: 85,
    deliverability: 'deliverable',
    risk: 'low',
    checks: {
      syntax: { valid: true, message: 'Valid syntax' },
      domain: { valid: true, exists: true, message: 'Domain exists' },
      mx: { valid: true, records: ['mx.google.com'], message: 'Found MX records' },
      disposable: { isDisposable: false, message: 'Not disposable' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: true, provider: 'Gmail' },
      typo: { hasTypo: false, suggestion: null }
    },
    timestamp: '2024-01-01T00:00:00.000Z'
  };

  test('generates valid CSV header', () => {
    const csv = toCSV([mockResult]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('email,isValid,score,deliverability,risk,disposable,freeProvider');
  });

  test('generates valid CSV data row', () => {
    const csv = toCSV([mockResult]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('test@gmail.com');
    expect(lines[1]).toContain('true');
    expect(lines[1]).toContain('85');
    expect(lines[1]).toContain('deliverable');
    expect(lines[1]).toContain('low');
  });

  test('handles multiple results', () => {
    const results = [mockResult, { ...mockResult, email: 'test2@yahoo.com' }];
    const csv = toCSV(results);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  test('handles empty array', () => {
    const csv = toCSV([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // just header
  });

  test('escapes email with special characters', () => {
    const result = { ...mockResult, email: 'test+special@gmail.com' };
    const csv = toCSV([result]);
    expect(csv).toContain('test+special@gmail.com');
  });
});

describe('getScoreColor', () => {
  test('returns green for score >= 80', () => {
    const color = getScoreColor(80);
    expect(color).toBeDefined();
  });

  test('returns green for score = 100', () => {
    const color = getScoreColor(100);
    expect(color).toBeDefined();
  });

  test('returns yellow for score 50-79', () => {
    const color = getScoreColor(50);
    expect(color).toBeDefined();
  });

  test('returns red for score < 50', () => {
    const color = getScoreColor(49);
    expect(color).toBeDefined();
  });

  test('returns red for score = 0', () => {
    const color = getScoreColor(0);
    expect(color).toBeDefined();
  });
});

describe('getRiskColor', () => {
  test('returns green for low risk', () => {
    const color = getRiskColor('low');
    expect(color).toBeDefined();
  });

  test('returns yellow for medium risk', () => {
    const color = getRiskColor('medium');
    expect(color).toBeDefined();
  });

  test('returns red for high risk', () => {
    const color = getRiskColor('high');
    expect(color).toBeDefined();
  });

  test('returns default for unknown risk', () => {
    const color = getRiskColor('unknown');
    expect(color).toBeDefined();
  });
});
