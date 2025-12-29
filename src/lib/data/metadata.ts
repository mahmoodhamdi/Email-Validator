/**
 * Data file metadata and versioning.
 * Tracks versions and last update times for all data files.
 */

export interface DataFileMetadata {
  version: string;
  lastUpdated: string;
  count: number;
  source?: string;
  description: string;
}

export interface DataFilesMetadata {
  disposableDomains: DataFileMetadata;
  freeProviders: DataFileMetadata;
  roleEmails: DataFileMetadata;
  blacklists: DataFileMetadata;
  commonTypos: DataFileMetadata;
}

/**
 * Current metadata for all data files.
 */
export const dataFilesMetadata: DataFilesMetadata = {
  disposableDomains: {
    version: '1.0.0',
    lastUpdated: '2025-01-15',
    count: 1111,
    source: 'https://github.com/disposable/disposable-email-domains',
    description: 'List of known disposable/temporary email domains',
  },
  freeProviders: {
    version: '1.0.0',
    lastUpdated: '2025-01-15',
    count: 111,
    description: 'List of free email service providers',
  },
  roleEmails: {
    version: '1.0.0',
    lastUpdated: '2025-01-15',
    count: 95,
    description: 'Common role-based email prefixes (admin, support, etc.)',
  },
  blacklists: {
    version: '1.0.0',
    lastUpdated: '2025-01-15',
    count: 10,
    description: 'DNS-based blackhole lists for spam detection',
  },
  commonTypos: {
    version: '1.0.0',
    lastUpdated: '2025-01-15',
    count: 119,
    description: 'Common domain typos and their corrections',
  },
};

/**
 * Get the combined version string for all data files.
 */
export function getDataVersion(): string {
  return `${dataFilesMetadata.disposableDomains.version}-${dataFilesMetadata.freeProviders.version}`;
}

/**
 * Get metadata for a specific data file.
 */
export function getDataFileMetadata(
  fileName: keyof DataFilesMetadata
): DataFileMetadata {
  return dataFilesMetadata[fileName];
}

/**
 * Get all data files metadata.
 */
export function getAllDataFilesMetadata(): DataFilesMetadata {
  return { ...dataFilesMetadata };
}
