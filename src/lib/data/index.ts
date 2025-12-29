/**
 * Data files barrel export.
 * Provides unified access to all validation data with metadata.
 */

// Disposable domains
export {
  getDisposableDomains,
  isDisposableDomain,
  clearDisposableDomainsCache,
} from './disposable-domains';

// Free providers
export {
  freeProviders,
  freeProviderDomains,
  getFreeProvider,
  type FreeProvider,
} from './free-providers';

// Role-based emails
export { roleBasedPrefixes, getRoleFromEmail } from './role-emails';

// DNS Blacklists
export {
  dnsBlacklists,
  getDnsBlacklists,
  BLACKLIST_COUNT,
} from './blacklists';

// Common typos
export { commonTypos, getSuggestion } from './common-typos';

// Metadata
export {
  dataFilesMetadata,
  getDataVersion,
  getDataFileMetadata,
  getAllDataFilesMetadata,
  type DataFileMetadata,
  type DataFilesMetadata,
} from './metadata';
