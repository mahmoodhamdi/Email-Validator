import type { DomainCheck } from '@/types/email';

export async function validateDomain(domain: string): Promise<DomainCheck> {
  try {
    // Basic domain format validation
    if (!domain || domain.length === 0) {
      return {
        valid: false,
        exists: false,
        message: 'Domain is empty',
      };
    }

    // Check for valid domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return {
        valid: false,
        exists: false,
        message: 'Invalid domain format',
      };
    }

    // Check for valid TLD length (minimum 2 characters)
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      return {
        valid: false,
        exists: false,
        message: 'Invalid TLD',
      };
    }

    // In browser environment, we can't do DNS lookups directly
    // We'll rely on MX record check for domain existence
    // For now, mark as valid if format is correct
    return {
      valid: true,
      exists: true,
      message: 'Domain format is valid',
    };
  } catch {
    return {
      valid: false,
      exists: false,
      message: 'Failed to validate domain',
    };
  }
}

export function isValidDomainFormat(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}
