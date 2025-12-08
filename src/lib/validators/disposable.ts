import type { DisposableCheck } from '@/types/email';
import { disposableDomains } from '@/lib/data/disposable-domains';

export function validateDisposable(domain: string): DisposableCheck {
  const lowerDomain = domain.toLowerCase();

  // Check direct match
  if (disposableDomains.has(lowerDomain)) {
    return {
      isDisposable: true,
      message: 'This is a known disposable email domain',
    };
  }

  // Check subdomain of disposable domain
  const parts = lowerDomain.split('.');
  if (parts.length > 2) {
    // Check if the root domain is disposable
    const rootDomain = parts.slice(-2).join('.');
    if (disposableDomains.has(rootDomain)) {
      return {
        isDisposable: true,
        message: 'This is a subdomain of a disposable email domain',
      };
    }
  }

  // Check for common disposable domain patterns
  const disposablePatterns = [
    /^temp/i,
    /^fake/i,
    /^trash/i,
    /^throw/i,
    /^spam/i,
    /^junk/i,
    /^disposable/i,
    /^temporary/i,
    /^burner/i,
    /minute.*mail/i,
    /guerrilla/i,
    /mailinator/i,
  ];

  for (const pattern of disposablePatterns) {
    if (pattern.test(lowerDomain)) {
      return {
        isDisposable: true,
        message: 'Domain matches disposable email pattern',
      };
    }
  }

  return {
    isDisposable: false,
    message: 'Not a disposable email domain',
  };
}
