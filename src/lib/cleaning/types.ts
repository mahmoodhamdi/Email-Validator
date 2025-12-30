export interface CleaningOptions {
  removeDuplicates: boolean;
  normalizeCase: boolean;
  trimWhitespace: boolean;
  removeInvalidSyntax: boolean;
  removeEmpty: boolean;
  sortAlphabetically: boolean;
  groupByDomain: boolean;
}

export interface CleaningResult {
  original: string[];
  cleaned: string[];
  changes: CleaningChange[];
  stats: CleaningStats;
}

export interface CleaningChange {
  type: CleaningChangeType;
  original?: string;
  cleaned?: string;
  count?: number;
}

export type CleaningChangeType =
  | "duplicate_removed"
  | "normalized"
  | "trimmed"
  | "invalid_removed"
  | "empty_removed"
  | "sorted"
  | "merged";

export interface CleaningStats {
  originalCount: number;
  cleanedCount: number;
  duplicatesRemoved: number;
  normalized: number;
  invalidRemoved: number;
  emptyRemoved: number;
}

export interface MergeResult {
  merged: string[];
  stats: {
    totalOriginal: number;
    totalMerged: number;
    duplicatesRemoved: number;
    listsCount: number;
  };
}
