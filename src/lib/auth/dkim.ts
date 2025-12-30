/**
 * DKIM (DomainKeys Identified Mail) Checker
 *
 * Checks for DKIM records by querying common selectors.
 * Note: DKIM selectors are not discoverable, so we check common ones.
 */

import { resolveTxt } from 'dns/promises';
import type { DKIMRecord, DKIMCheckResult } from './types';

/**
 * Common DKIM selectors used by popular email providers
 */
const COMMON_SELECTORS = [
  'default',
  'selector1', // Microsoft 365
  'selector2', // Microsoft 365
  'google', // Google Workspace
  's1',
  's2',
  'k1',
  'dkim',
  'mail',
  'email',
  'smtp',
  'mx',
] as const;

/**
 * Check DKIM records for a domain by querying common selectors
 */
export async function checkDKIM(domain: string): Promise<DKIMCheckResult> {
  const records: DKIMRecord[] = [];
  const selectorsChecked: string[] = [];

  // Check all selectors in parallel for performance
  const results = await Promise.allSettled(
    COMMON_SELECTORS.map(async (selector) => {
      selectorsChecked.push(selector);
      return checkDKIMSelector(domain, selector);
    })
  );

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      records.push(result.value);
    }
  }

  return {
    found: records.length > 0,
    records,
    selectorsChecked,
    message:
      records.length > 0
        ? `Found ${records.length} DKIM record(s)`
        : 'No DKIM records found for common selectors',
  };
}

/**
 * Check a specific DKIM selector for a domain
 */
async function checkDKIMSelector(
  domain: string,
  selector: string
): Promise<DKIMRecord | null> {
  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const txtRecords = await resolveTxt(dkimDomain);
    const dkimRecord = txtRecords.flat().join('');

    if (dkimRecord && dkimRecord.includes('p=')) {
      return parseDKIM(selector, dkimRecord);
    }

    return null;
  } catch {
    // Selector not found or DNS error
    return null;
  }
}

/**
 * Parse DKIM record string
 */
export function parseDKIM(selector: string, record: string): DKIMRecord {
  const errors: string[] = [];
  const result: DKIMRecord = {
    selector,
    raw: record,
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
        break;
      case 'k':
        result.keyType = value;
        break;
      case 'p':
        result.publicKey = value;
        if (!value) {
          errors.push('Empty public key (revoked)');
        }
        break;
    }
  }

  result.errors = errors;
  result.valid = errors.length === 0 && !!result.publicKey;

  return result;
}
