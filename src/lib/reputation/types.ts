/**
 * Domain Reputation Types
 *
 * Types for domain age, blocklist, and reputation scoring.
 */

export interface DomainAge {
  /** Domain creation date (if available) */
  createdDate: Date | null;
  /** Age in days (if available) */
  ageInDays: number | null;
  /** Domain is less than 30 days old */
  isNew: boolean;
  /** Domain is less than 180 days old */
  isYoung: boolean;
  /** Human-readable message */
  message: string;
}

export interface BlocklistResult {
  /** Whether domain is on any blocklist */
  listed: boolean;
  /** Individual blocklist entries */
  lists: BlocklistEntry[];
  /** Number of blocklists checked */
  checkedCount: number;
  /** Human-readable message */
  message: string;
}

export interface BlocklistEntry {
  /** Blocklist name */
  name: string;
  /** Whether domain is listed */
  listed: boolean;
  /** Type of blocklist */
  type: 'spam' | 'phishing' | 'malware' | 'general';
  /** URL for more info */
  url?: string;
}

export interface DomainInfo {
  /** Domain name */
  domain: string;
  /** Registrar (if available) */
  registrar?: string;
  /** Nameservers (if available) */
  nameservers?: string[];
  /** Whether WHOIS privacy is enabled */
  hasWhoisPrivacy: boolean;
}

export interface ReputationResult {
  /** Overall reputation score (0-100) */
  score: number;
  /** Risk level based on score */
  risk: 'low' | 'medium' | 'high' | 'critical';
  /** Domain age information */
  age: DomainAge;
  /** Blocklist check results */
  blocklists: BlocklistResult;
  /** Domain registration info */
  domainInfo: DomainInfo;
  /** Individual reputation factors */
  factors: ReputationFactor[];
  /** Human-readable summary */
  summary: string;
}

export interface ReputationFactor {
  /** Factor name */
  name: string;
  /** Impact on reputation */
  impact: 'positive' | 'negative' | 'neutral';
  /** Score adjustment */
  score: number;
  /** Description of the factor */
  description: string;
}
