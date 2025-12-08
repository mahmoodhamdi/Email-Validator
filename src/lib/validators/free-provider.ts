import type { FreeProviderCheck } from '@/types/email';
import { getFreeProvider, freeProviderDomains } from '@/lib/data/free-providers';

export function validateFreeProvider(domain: string): FreeProviderCheck {
  const lowerDomain = domain.toLowerCase();

  // Check direct match
  if (freeProviderDomains.has(lowerDomain)) {
    const provider = getFreeProvider(lowerDomain);
    return {
      isFree: true,
      provider: provider?.name || null,
    };
  }

  // Check subdomain of free provider
  const parts = lowerDomain.split('.');
  if (parts.length > 2) {
    // Try different combinations
    for (let i = 1; i < parts.length; i++) {
      const possibleDomain = parts.slice(i).join('.');
      if (freeProviderDomains.has(possibleDomain)) {
        const provider = getFreeProvider(possibleDomain);
        return {
          isFree: true,
          provider: provider?.name || null,
        };
      }
    }
  }

  return {
    isFree: false,
    provider: null,
  };
}
