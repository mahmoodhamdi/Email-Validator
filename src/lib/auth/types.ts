/**
 * Email Authentication Types
 * SPF, DMARC, DKIM record parsing and checking
 */

export interface SPFRecord {
  raw: string;
  version: string;
  mechanisms: SPFMechanism[];
  modifiers: SPFModifier[];
  valid: boolean;
  errors: string[];
}

export interface SPFMechanism {
  qualifier: '+' | '-' | '~' | '?';
  type: 'all' | 'include' | 'a' | 'mx' | 'ptr' | 'ip4' | 'ip6' | 'exists';
  value?: string;
}

export interface SPFModifier {
  type: 'redirect' | 'exp';
  value: string;
}

export interface DMARCRecord {
  raw: string;
  version: string;
  policy: 'none' | 'quarantine' | 'reject';
  subdomainPolicy?: 'none' | 'quarantine' | 'reject';
  percentage?: number;
  rua?: string[]; // Aggregate report URIs
  ruf?: string[]; // Forensic report URIs
  adkim?: 'r' | 's'; // DKIM alignment mode
  aspf?: 'r' | 's'; // SPF alignment mode
  valid: boolean;
  errors: string[];
}

export interface DKIMRecord {
  selector: string;
  raw: string;
  version?: string;
  keyType?: string;
  publicKey?: string;
  valid: boolean;
  errors: string[];
}

export interface AuthenticationResult {
  spf: SPFCheckResult;
  dmarc: DMARCCheckResult;
  dkim: DKIMCheckResult;
  score: number; // 0-100
  summary: string;
}

export interface SPFCheckResult {
  exists: boolean;
  record?: SPFRecord;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  message: string;
}

export interface DMARCCheckResult {
  exists: boolean;
  record?: DMARCRecord;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  message: string;
}

export interface DKIMCheckResult {
  found: boolean;
  records: DKIMRecord[];
  selectorsChecked: string[];
  message: string;
}

export interface AuthCheckOptions {
  enabled?: boolean;
  timeout?: number;
}
