/**
 * DMARC (Domain-based Message Authentication, Reporting & Conformance) Parser and Checker
 */

import { resolveTxt } from 'dns/promises';
import type { DMARCRecord, DMARCCheckResult } from './types';

/**
 * Check DMARC record for a domain
 */
export async function checkDMARC(domain: string): Promise<DMARCCheckResult> {
  try {
    const dmarcDomain = `_dmarc.${domain}`;
    const records = await resolveTxt(dmarcDomain);
    const dmarcRecord = records.flat().find((r) => r.startsWith('v=DMARC1'));

    if (!dmarcRecord) {
      return {
        exists: false,
        strength: 'none',
        message: 'No DMARC record found',
      };
    }

    const parsed = parseDMARC(dmarcRecord);
    const strength = evaluateDMARCStrength(parsed);

    return {
      exists: true,
      record: parsed,
      strength,
      message: getDMARCMessage(strength, parsed),
    };
  } catch (error) {
    return {
      exists: false,
      strength: 'none',
      message: error instanceof Error ? error.message : 'Failed to check DMARC',
    };
  }
}

/**
 * Parse DMARC record string
 */
export function parseDMARC(record: string): DMARCRecord {
  const errors: string[] = [];
  const result: DMARCRecord = {
    raw: record,
    version: '',
    policy: 'none',
    valid: true,
    errors: [],
  };

  const parts = record
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=').trim();

    switch (key.trim().toLowerCase()) {
      case 'v':
        result.version = value;
        if (value !== 'DMARC1') {
          errors.push('Invalid DMARC version');
        }
        break;
      case 'p':
        if (['none', 'quarantine', 'reject'].includes(value)) {
          result.policy = value as DMARCRecord['policy'];
        } else {
          errors.push(`Invalid policy: ${value}`);
        }
        break;
      case 'sp':
        if (['none', 'quarantine', 'reject'].includes(value)) {
          result.subdomainPolicy = value as DMARCRecord['subdomainPolicy'];
        }
        break;
      case 'pct':
        result.percentage = parseInt(value, 10);
        break;
      case 'rua':
        result.rua = value.split(',').map((u) => u.trim());
        break;
      case 'ruf':
        result.ruf = value.split(',').map((u) => u.trim());
        break;
      case 'adkim':
        if (['r', 's'].includes(value)) {
          result.adkim = value as 'r' | 's';
        }
        break;
      case 'aspf':
        if (['r', 's'].includes(value)) {
          result.aspf = value as 'r' | 's';
        }
        break;
    }
  }

  result.errors = errors;
  result.valid = errors.length === 0;

  return result;
}

/**
 * Evaluate DMARC strength based on record configuration
 */
function evaluateDMARCStrength(record: DMARCRecord): DMARCCheckResult['strength'] {
  if (!record.valid) {
    return 'weak';
  }

  switch (record.policy) {
    case 'reject':
      return 'strong';
    case 'quarantine':
      return 'moderate';
    case 'none':
      // 'none' with reporting is at least monitoring
      if (record.rua || record.ruf) {
        return 'weak';
      }
      return 'none';
    default:
      return 'none';
  }
}

/**
 * Get human-readable DMARC message
 */
function getDMARCMessage(strength: DMARCCheckResult['strength'], record: DMARCRecord): string {
  switch (strength) {
    case 'strong':
      return `DMARC policy: reject (${record.percentage ?? 100}%)`;
    case 'moderate':
      return `DMARC policy: quarantine (${record.percentage ?? 100}%)`;
    case 'weak':
      return 'DMARC policy: none (monitoring only)';
    default:
      return 'No DMARC policy configured';
  }
}
