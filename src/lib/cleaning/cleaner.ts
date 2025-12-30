import {
  CleaningOptions,
  CleaningResult,
  CleaningChange,
  CleaningStats,
  MergeResult,
} from "./types";

const DEFAULT_OPTIONS: CleaningOptions = {
  removeDuplicates: true,
  normalizeCase: true,
  trimWhitespace: true,
  removeInvalidSyntax: true,
  removeEmpty: true,
  sortAlphabetically: false,
  groupByDomain: false,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Clean a list of emails according to options
 */
export function cleanEmailList(
  emails: string[],
  options: Partial<CleaningOptions> = {}
): CleaningResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const changes: CleaningChange[] = [];
  let cleaned = [...emails];
  const stats: CleaningStats = {
    originalCount: emails.length,
    cleanedCount: 0,
    duplicatesRemoved: 0,
    normalized: 0,
    invalidRemoved: 0,
    emptyRemoved: 0,
  };

  // Remove empty entries
  if (opts.removeEmpty) {
    const beforeCount = cleaned.length;
    cleaned = cleaned.filter((email) => email && email.trim().length > 0);
    stats.emptyRemoved = beforeCount - cleaned.length;
    if (stats.emptyRemoved > 0) {
      changes.push({
        type: "empty_removed",
        count: stats.emptyRemoved,
      });
    }
  }

  // Trim whitespace
  if (opts.trimWhitespace) {
    cleaned = cleaned.map((email) => {
      const trimmed = email.trim();
      if (trimmed !== email) {
        changes.push({
          type: "trimmed",
          original: email,
          cleaned: trimmed,
        });
      }
      return trimmed;
    });
  }

  // Normalize case (lowercase)
  if (opts.normalizeCase) {
    cleaned = cleaned.map((email) => {
      const normalized = email.toLowerCase();
      if (normalized !== email) {
        stats.normalized++;
        changes.push({
          type: "normalized",
          original: email,
          cleaned: normalized,
        });
      }
      return normalized;
    });
  }

  // Remove invalid syntax
  if (opts.removeInvalidSyntax) {
    const beforeCount = cleaned.length;
    cleaned = cleaned.filter((email) => EMAIL_REGEX.test(email));
    stats.invalidRemoved = beforeCount - cleaned.length;
    if (stats.invalidRemoved > 0) {
      changes.push({
        type: "invalid_removed",
        count: stats.invalidRemoved,
      });
    }
  }

  // Remove duplicates
  if (opts.removeDuplicates) {
    const beforeCount = cleaned.length;
    const seen = new Set<string>();
    cleaned = cleaned.filter((email) => {
      if (seen.has(email)) {
        return false;
      }
      seen.add(email);
      return true;
    });
    stats.duplicatesRemoved = beforeCount - cleaned.length;
    if (stats.duplicatesRemoved > 0) {
      changes.push({
        type: "duplicate_removed",
        count: stats.duplicatesRemoved,
      });
    }
  }

  // Sort alphabetically
  if (opts.sortAlphabetically) {
    cleaned.sort((a, b) => a.localeCompare(b));
    changes.push({ type: "sorted" });
  }

  // Group by domain
  if (opts.groupByDomain) {
    cleaned.sort((a, b) => {
      const domainA = a.split("@")[1] || "";
      const domainB = b.split("@")[1] || "";
      return domainA.localeCompare(domainB) || a.localeCompare(b);
    });
  }

  stats.cleanedCount = cleaned.length;

  return {
    original: emails,
    cleaned,
    changes,
    stats,
  };
}

/**
 * Merge multiple email lists
 */
export function mergeEmailLists(
  lists: string[][],
  options: Partial<CleaningOptions> = {}
): MergeResult {
  const allEmails = lists.flat();
  const totalOriginal = allEmails.length;

  // Clean the merged list
  const cleaned = cleanEmailList(allEmails, {
    ...options,
    removeDuplicates: true,
  });

  return {
    merged: cleaned.cleaned,
    stats: {
      totalOriginal,
      totalMerged: cleaned.stats.cleanedCount,
      duplicatesRemoved: cleaned.stats.duplicatesRemoved,
      listsCount: lists.length,
    },
  };
}

/**
 * Find duplicates in a list
 */
export function findDuplicates(emails: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const normalized = emails.map((e) => e.toLowerCase().trim());

  normalized.forEach((email) => {
    counts.set(email, (counts.get(email) || 0) + 1);
  });

  // Filter to only duplicates
  const duplicates = new Map<string, number>();
  counts.forEach((count, email) => {
    if (count > 1) {
      duplicates.set(email, count);
    }
  });

  return duplicates;
}

/**
 * Group emails by domain
 */
export function groupByDomain(emails: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  emails.forEach((email) => {
    const domain = email.split("@")[1]?.toLowerCase() || "unknown";
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(email);
  });

  return groups;
}

/**
 * Validate email syntax
 */
export function isValidEmailSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}
