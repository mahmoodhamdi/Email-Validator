/**
 * Domain Age Checker
 *
 * Checks domain age via RDAP (Registration Data Access Protocol).
 * Newer domains are considered higher risk for spam/fraud.
 */

import type { DomainAge } from './types';

/**
 * RDAP servers for common TLDs
 */
const RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  net: 'https://rdap.verisign.com/net/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
  io: 'https://rdap.nic.io/domain/',
  co: 'https://rdap.nic.co/domain/',
  me: 'https://rdap.nic.me/domain/',
  dev: 'https://rdap.nic.google/domain/',
  app: 'https://rdap.nic.google/domain/',
};

/**
 * Check domain age via RDAP lookup
 *
 * @param domain - Domain to check
 * @returns Domain age information
 */
export async function checkDomainAge(domain: string): Promise<DomainAge> {
  try {
    const rdapResult = await fetchRDAP(domain);

    if (rdapResult?.createdDate) {
      const createdDate = new Date(rdapResult.createdDate);
      const now = new Date();
      const ageInDays = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        createdDate,
        ageInDays,
        isNew: ageInDays < 30,
        isYoung: ageInDays < 180,
        message: formatAgeMessage(ageInDays),
      };
    }

    // Fallback: Can't determine age
    return {
      createdDate: null,
      ageInDays: null,
      isNew: false,
      isYoung: false,
      message: 'Domain age could not be determined',
    };
  } catch {
    return {
      createdDate: null,
      ageInDays: null,
      isNew: false,
      isYoung: false,
      message: 'Failed to check domain age',
    };
  }
}

/**
 * Fetch domain info from RDAP server
 */
async function fetchRDAP(
  domain: string
): Promise<{ createdDate?: string } | null> {
  // Extract TLD
  const parts = domain.split('.');
  const tld = parts[parts.length - 1]?.toLowerCase();
  if (!tld) {
    return null;
  }

  const server = RDAP_SERVERS[tld];
  if (!server) {
    // TLD not supported - could try IANA bootstrap in the future
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${server}${domain}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Find registration event
    const events = data.events || [];
    const registration = events.find(
      (e: { eventAction?: string }) => e.eventAction === 'registration'
    );

    return {
      createdDate: registration?.eventDate,
    };
  } catch {
    return null;
  }
}

/**
 * Format age into human-readable message
 */
function formatAgeMessage(ageInDays: number): string {
  if (ageInDays < 7) {
    return `Domain registered ${ageInDays} day(s) ago (very new - high risk)`;
  } else if (ageInDays < 30) {
    return `Domain registered ${ageInDays} days ago (new domain)`;
  } else if (ageInDays < 180) {
    const months = Math.floor(ageInDays / 30);
    return `Domain is ${months} month(s) old`;
  } else if (ageInDays < 365) {
    const months = Math.floor(ageInDays / 30);
    return `Domain is ${months} months old`;
  } else {
    const years = Math.floor(ageInDays / 365);
    return `Domain is ${years}+ year(s) old (established)`;
  }
}
