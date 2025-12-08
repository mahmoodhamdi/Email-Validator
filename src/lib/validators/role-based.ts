import type { RoleBasedCheck } from '@/types/email';
import { getRoleFromEmail, roleBasedPrefixes } from '@/lib/data/role-emails';

export function validateRoleBased(localPart: string): RoleBasedCheck {
  const role = getRoleFromEmail(localPart);

  if (role) {
    return {
      isRoleBased: true,
      role,
    };
  }

  // Additional check for common role patterns
  const lowerLocal = localPart.toLowerCase();

  // Check if starts with a role prefix followed by numbers or special chars
  for (const prefix of roleBasedPrefixes) {
    if (lowerLocal.startsWith(prefix) && (
      lowerLocal === prefix ||
      /^[0-9._-]/.test(lowerLocal.slice(prefix.length))
    )) {
      return {
        isRoleBased: true,
        role: prefix,
      };
    }
  }

  return {
    isRoleBased: false,
    role: null,
  };
}
