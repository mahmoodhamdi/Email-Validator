import type { TypoCheck } from '@/types/email';
import { getSuggestion } from '@/lib/data/common-typos';

export function validateTypo(domain: string): TypoCheck {
  const suggestion = getSuggestion(domain);

  if (suggestion && suggestion !== domain.toLowerCase()) {
    return {
      hasTypo: true,
      suggestion,
    };
  }

  return {
    hasTypo: false,
    suggestion: null,
  };
}

export function suggestCorrection(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  const suggestion = getSuggestion(domain);
  if (suggestion && suggestion !== domain.toLowerCase()) {
    return `${localPart}@${suggestion}`;
  }

  return null;
}
