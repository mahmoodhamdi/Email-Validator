/**
 * SPF (Sender Policy Framework) Parser and Checker
 */

import { resolveTxt } from 'dns/promises';
import type { SPFRecord, SPFMechanism, SPFModifier, SPFCheckResult } from './types';

const SPF_QUALIFIERS = ['+', '-', '~', '?'] as const;
const SPF_MECHANISMS = ['all', 'include', 'a', 'mx', 'ptr', 'ip4', 'ip6', 'exists'] as const;

/**
 * Check SPF record for a domain
 */
export async function checkSPF(domain: string): Promise<SPFCheckResult> {
  try {
    const records = await resolveTxt(domain);
    const spfRecord = records.flat().find((r) => r.startsWith('v=spf1'));

    if (!spfRecord) {
      return {
        exists: false,
        strength: 'none',
        message: 'No SPF record found',
      };
    }

    const parsed = parseSPF(spfRecord);
    const strength = evaluateSPFStrength(parsed);

    return {
      exists: true,
      record: parsed,
      strength,
      message: getSPFMessage(strength, parsed),
    };
  } catch (error) {
    return {
      exists: false,
      strength: 'none',
      message: error instanceof Error ? error.message : 'Failed to check SPF',
    };
  }
}

/**
 * Parse SPF record string
 */
export function parseSPF(record: string): SPFRecord {
  const errors: string[] = [];
  const mechanisms: SPFMechanism[] = [];
  const modifiers: SPFModifier[] = [];

  const parts = record.trim().split(/\s+/);
  const version = parts[0];

  if (version !== 'v=spf1') {
    errors.push('Invalid SPF version');
  }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Check for modifiers (redirect=, exp=)
    if (part.includes('=')) {
      const [type, value] = part.split('=');
      if (type === 'redirect' || type === 'exp') {
        modifiers.push({ type, value });
      }
      continue;
    }

    // Parse mechanism
    let qualifier: SPFMechanism['qualifier'] = '+';
    let mechanismStr = part;

    if (SPF_QUALIFIERS.includes(part[0] as (typeof SPF_QUALIFIERS)[number])) {
      qualifier = part[0] as SPFMechanism['qualifier'];
      mechanismStr = part.slice(1);
    }

    // Extract mechanism type and value
    const colonIndex = mechanismStr.indexOf(':');
    const slashIndex = mechanismStr.indexOf('/');

    let type: string;
    let value: string | undefined;

    if (colonIndex !== -1) {
      type = mechanismStr.slice(0, colonIndex);
      value = mechanismStr.slice(colonIndex + 1);
    } else if (slashIndex !== -1) {
      type = mechanismStr.slice(0, slashIndex);
      value = mechanismStr.slice(slashIndex);
    } else {
      type = mechanismStr;
    }

    if (SPF_MECHANISMS.includes(type as (typeof SPF_MECHANISMS)[number])) {
      mechanisms.push({
        qualifier,
        type: type as SPFMechanism['type'],
        value,
      });
    } else {
      errors.push(`Unknown mechanism: ${type}`);
    }
  }

  return {
    raw: record,
    version,
    mechanisms,
    modifiers,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Evaluate SPF strength based on record configuration
 */
function evaluateSPFStrength(record: SPFRecord): SPFCheckResult['strength'] {
  if (!record.valid) {
    return 'weak';
  }

  const allMechanism = record.mechanisms.find((m) => m.type === 'all');

  if (!allMechanism) {
    return 'weak';
  }

  // -all is strong (hard fail)
  if (allMechanism.qualifier === '-') {
    return 'strong';
  }

  // ~all is moderate (soft fail)
  if (allMechanism.qualifier === '~') {
    return 'moderate';
  }

  // ?all or +all is weak
  return 'weak';
}

/**
 * Get human-readable SPF message
 */
function getSPFMessage(strength: SPFCheckResult['strength'], record: SPFRecord): string {
  switch (strength) {
    case 'strong':
      return 'SPF configured with hard fail (-all)';
    case 'moderate':
      return 'SPF configured with soft fail (~all)';
    case 'weak':
      if (record.errors.length > 0) {
        return `SPF has errors: ${record.errors.join(', ')}`;
      }
      return 'SPF configured but with weak policy';
    default:
      return 'No SPF record found';
  }
}
