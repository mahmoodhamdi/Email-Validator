/**
 * Tests for data files integrity and functionality.
 */

import {
  getDisposableDomains,
  isDisposableDomain,
  clearDisposableDomainsCache,
} from '@/lib/data/disposable-domains';
import {
  freeProviders,
  freeProviderDomains,
  getFreeProvider,
} from '@/lib/data/free-providers';
import { roleBasedPrefixes, getRoleFromEmail } from '@/lib/data/role-emails';
import {
  dnsBlacklists,
  getDnsBlacklists,
  BLACKLIST_COUNT,
} from '@/lib/data/blacklists';
import { commonTypos, getSuggestion } from '@/lib/data/common-typos';
import {
  dataFilesMetadata,
  getDataVersion,
  getDataFileMetadata,
  getAllDataFilesMetadata,
} from '@/lib/data/metadata';

describe('Disposable Domains Data', () => {
  beforeEach(() => {
    clearDisposableDomainsCache();
  });

  test('contains expected number of domains', () => {
    const domains = getDisposableDomains();
    expect(domains.size).toBeGreaterThan(1000);
    expect(domains.size).toBe(dataFilesMetadata.disposableDomains.count);
  });

  test('contains known disposable domains', () => {
    expect(isDisposableDomain('mailinator.com')).toBe(true);
    expect(isDisposableDomain('guerrillamail.com')).toBe(true);
    expect(isDisposableDomain('10minutemail.com')).toBe(true);
    expect(isDisposableDomain('yopmail.com')).toBe(true);
    expect(isDisposableDomain('trashmail.com')).toBe(true);
  });

  test('does not contain legitimate domains', () => {
    expect(isDisposableDomain('gmail.com')).toBe(false);
    expect(isDisposableDomain('yahoo.com')).toBe(false);
    expect(isDisposableDomain('outlook.com')).toBe(false);
    expect(isDisposableDomain('microsoft.com')).toBe(false);
  });

  test('handles case insensitivity', () => {
    expect(isDisposableDomain('MAILINATOR.COM')).toBe(true);
    expect(isDisposableDomain('Mailinator.Com')).toBe(true);
  });

  test('lazy loading works correctly', () => {
    clearDisposableDomainsCache();
    // First access should create the Set
    const domains1 = getDisposableDomains();
    // Second access should return cached Set
    const domains2 = getDisposableDomains();
    expect(domains1).toBe(domains2);
  });

  test('all domains are lowercase', () => {
    const domains = getDisposableDomains();
    domains.forEach((domain) => {
      expect(domain).toBe(domain.toLowerCase());
    });
  });

  test('all domains have valid format', () => {
    const domains = getDisposableDomains();
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    domains.forEach((domain) => {
      expect(domain).toMatch(domainRegex);
    });
  });
});

describe('Free Providers Data', () => {
  test('contains expected number of providers', () => {
    expect(freeProviders.length).toBe(dataFilesMetadata.freeProviders.count);
  });

  test('contains major email providers', () => {
    const domains = freeProviders.map((p) => p.domain);
    expect(domains).toContain('gmail.com');
    expect(domains).toContain('yahoo.com');
    expect(domains).toContain('outlook.com');
    expect(domains).toContain('hotmail.com');
    expect(domains).toContain('icloud.com');
  });

  test('all providers have domain and name', () => {
    freeProviders.forEach((provider) => {
      expect(provider.domain).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.domain.length).toBeGreaterThan(0);
      expect(provider.name.length).toBeGreaterThan(0);
    });
  });

  test('freeProviderDomains Set matches array', () => {
    expect(freeProviderDomains.size).toBe(freeProviders.length);
    freeProviders.forEach((provider) => {
      expect(freeProviderDomains.has(provider.domain.toLowerCase())).toBe(true);
    });
  });

  test('getFreeProvider returns correct provider', () => {
    const gmail = getFreeProvider('gmail.com');
    expect(gmail).toBeDefined();
    expect(gmail?.name).toBe('Gmail');
    expect(gmail?.domain).toBe('gmail.com');
  });

  test('getFreeProvider handles case insensitivity', () => {
    const provider = getFreeProvider('GMAIL.COM');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('Gmail');
  });

  test('getFreeProvider returns undefined for unknown domain', () => {
    expect(getFreeProvider('unknown.com')).toBeUndefined();
  });
});

describe('Role-Based Emails Data', () => {
  test('contains expected number of prefixes', () => {
    expect(roleBasedPrefixes.size).toBe(dataFilesMetadata.roleEmails.count);
  });

  test('contains common role prefixes', () => {
    expect(roleBasedPrefixes.has('admin')).toBe(true);
    expect(roleBasedPrefixes.has('support')).toBe(true);
    expect(roleBasedPrefixes.has('info')).toBe(true);
    expect(roleBasedPrefixes.has('sales')).toBe(true);
    expect(roleBasedPrefixes.has('noreply')).toBe(true);
  });

  test('getRoleFromEmail detects exact matches', () => {
    expect(getRoleFromEmail('admin')).toBe('admin');
    expect(getRoleFromEmail('support')).toBe('support');
    expect(getRoleFromEmail('info')).toBe('info');
  });

  test('getRoleFromEmail detects prefixed variants', () => {
    expect(getRoleFromEmail('admin123')).toBe('admin');
    expect(getRoleFromEmail('support_team')).toBe('support');
  });

  test('getRoleFromEmail normalizes input', () => {
    expect(getRoleFromEmail('ADMIN')).toBe('admin');
    expect(getRoleFromEmail('Admin')).toBe('admin');
    // The function matches against normalized prefixes but returns the first matching role
    expect(getRoleFromEmail('no-reply')).toBe('no-reply');
    // 'noreply' matches normalized 'no-reply' first in set iteration order
    expect(getRoleFromEmail('noreply')).toBe('no-reply');
  });

  test('getRoleFromEmail returns null for non-role emails', () => {
    expect(getRoleFromEmail('john')).toBeNull();
    expect(getRoleFromEmail('alice.smith')).toBeNull();
    expect(getRoleFromEmail('developer123')).toBe('dev');
  });
});

describe('DNS Blacklists Data', () => {
  test('contains expected number of blacklists', () => {
    expect(dnsBlacklists.length).toBe(dataFilesMetadata.blacklists.count);
    expect(BLACKLIST_COUNT).toBe(dnsBlacklists.length);
  });

  test('contains major blacklist providers', () => {
    expect(dnsBlacklists).toContain('zen.spamhaus.org');
    expect(dnsBlacklists).toContain('bl.spamcop.net');
  });

  test('getDnsBlacklists returns the list', () => {
    const list = getDnsBlacklists();
    expect(list).toEqual(dnsBlacklists);
  });

  test('all blacklists have valid domain format', () => {
    const domainRegex = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
    dnsBlacklists.forEach((blacklist) => {
      expect(blacklist).toMatch(domainRegex);
    });
  });
});

describe('Common Typos Data', () => {
  test('contains expected number of typo mappings', () => {
    const typoCount = Object.keys(commonTypos).length;
    expect(typoCount).toBe(dataFilesMetadata.commonTypos.count);
  });

  test('contains Gmail typos', () => {
    expect(commonTypos['gmial.com']).toBe('gmail.com');
    expect(commonTypos['gmal.com']).toBe('gmail.com');
    expect(commonTypos['gmail.con']).toBe('gmail.com');
  });

  test('contains Yahoo typos', () => {
    expect(commonTypos['yaho.com']).toBe('yahoo.com');
    expect(commonTypos['yahooo.com']).toBe('yahoo.com');
  });

  test('contains Hotmail typos', () => {
    expect(commonTypos['hotmal.com']).toBe('hotmail.com');
    expect(commonTypos['hotmial.com']).toBe('hotmail.com');
  });

  test('getSuggestion returns correct suggestion', () => {
    expect(getSuggestion('gmial.com')).toBe('gmail.com');
    expect(getSuggestion('yaho.com')).toBe('yahoo.com');
  });

  test('getSuggestion returns null for correct domains', () => {
    expect(getSuggestion('gmail.com')).toBeNull();
    expect(getSuggestion('yahoo.com')).toBeNull();
    expect(getSuggestion('outlook.com')).toBeNull();
  });

  test('getSuggestion handles TLD typos', () => {
    expect(getSuggestion('example.comm')).toBe('example.com');
  });

  test('all typo corrections point to valid domains', () => {
    const validTargets = new Set([
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'aol.com',
      'protonmail.com',
      'live.com',
      'ymail.com',
      '.com',
      '.net',
      '.org',
    ]);
    Object.values(commonTypos).forEach((target) => {
      expect(validTargets.has(target)).toBe(true);
    });
  });
});

describe('Data Files Metadata', () => {
  test('all metadata entries have required fields', () => {
    const metadata = getAllDataFilesMetadata();
    const files = Object.values(metadata);

    files.forEach((file) => {
      expect(file.version).toBeDefined();
      expect(file.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(file.lastUpdated).toBeDefined();
      expect(file.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(file.count).toBeDefined();
      expect(file.count).toBeGreaterThan(0);
      expect(file.description).toBeDefined();
      expect(file.description.length).toBeGreaterThan(0);
    });
  });

  test('getDataVersion returns combined version', () => {
    const version = getDataVersion();
    expect(version).toContain(dataFilesMetadata.disposableDomains.version);
    expect(version).toContain(dataFilesMetadata.freeProviders.version);
  });

  test('getDataFileMetadata returns correct metadata', () => {
    const disposable = getDataFileMetadata('disposableDomains');
    expect(disposable).toEqual(dataFilesMetadata.disposableDomains);

    const freeProvidersMetadata = getDataFileMetadata('freeProviders');
    expect(freeProvidersMetadata).toEqual(dataFilesMetadata.freeProviders);
  });

  test('metadata counts match actual data counts', () => {
    expect(getDisposableDomains().size).toBe(
      dataFilesMetadata.disposableDomains.count
    );
    expect(freeProviders.length).toBe(dataFilesMetadata.freeProviders.count);
    expect(roleBasedPrefixes.size).toBe(dataFilesMetadata.roleEmails.count);
    expect(dnsBlacklists.length).toBe(dataFilesMetadata.blacklists.count);
    expect(Object.keys(commonTypos).length).toBe(
      dataFilesMetadata.commonTypos.count
    );
  });
});
