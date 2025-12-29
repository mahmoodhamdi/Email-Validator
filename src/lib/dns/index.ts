/**
 * DNS utilities with provider fallback and caching.
 */

export {
  queryDns,
  getProviderStats,
  getDnsCacheStats,
  resetProviderState,
  clearDnsCaches,
  DNS_PROVIDERS,
  type DnsProvider,
  type DnsApiResponse,
  type DnsQueryResult,
} from './providers';
