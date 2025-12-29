#!/usr/bin/env ts-node
/**
 * Script to update the disposable domains list from external sources.
 *
 * Usage:
 *   npx ts-node scripts/update-disposable-domains.ts
 *
 * Or add to package.json scripts:
 *   "update:domains": "ts-node scripts/update-disposable-domains.ts"
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCES = [
  'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
  'https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json',
];

const OUTPUT_PATH = path.join(
  __dirname,
  '../src/lib/data/disposable-domains.ts'
);
const METADATA_PATH = path.join(__dirname, '../src/lib/data/metadata.ts');

async function fetchDomains(): Promise<Set<string>> {
  const domains = new Set<string>();

  for (const source of SOURCES) {
    try {
      console.log(`Fetching from ${source}...`);
      const response = await fetch(source);

      if (!response.ok) {
        console.warn(`Failed to fetch from ${source}: ${response.status}`);
        continue;
      }

      const text = await response.text();

      if (source.endsWith('.json')) {
        const jsonDomains = JSON.parse(text);
        if (Array.isArray(jsonDomains)) {
          jsonDomains.forEach((d: string) => domains.add(d.toLowerCase().trim()));
        }
      } else {
        text
          .split('\n')
          .map((line: string) => line.toLowerCase().trim())
          .filter((line: string) => line && !line.startsWith('#'))
          .forEach((domain: string) => domains.add(domain));
      }

      console.log(`  Added domains from ${source}`);
    } catch (error) {
      console.error(`Error fetching from ${source}:`, error);
    }
  }

  return domains;
}

function generateFileContent(domains: string[]): string {
  const sortedDomains = domains.sort();

  return `/**
 * Lazy-loaded Set of disposable email domains.
 * The Set is created only when first accessed, reducing initial load time.
 */

// Private variable to hold the cached Set
let _disposableDomains: Set<string> | null = null;

/**
 * Get the Set of disposable domains.
 * Uses lazy loading - the Set is created on first access.
 *
 * @returns Set of disposable domain names
 */
export function getDisposableDomains(): Set<string> {
  if (_disposableDomains === null) {
    _disposableDomains = new Set(disposableDomainsList);
  }
  return _disposableDomains;
}

/**
 * Check if a domain is in the disposable list.
 *
 * @param domain - The domain to check
 * @returns true if the domain is disposable
 */
export function isDisposableDomain(domain: string): boolean {
  return getDisposableDomains().has(domain.toLowerCase());
}

/**
 * Clear the cached domains Set.
 * Useful for testing or if the list needs to be reloaded.
 */
export function clearDisposableDomainsCache(): void {
  _disposableDomains = null;
}

// Raw list of disposable domains
const disposableDomainsList = [
${sortedDomains.map((d) => `  '${d}',`).join('\n')}
];
`;
}

function updateMetadata(count: number): void {
  const today = new Date().toISOString().split('T')[0];

  // Read current metadata
  const metadataContent = fs.readFileSync(METADATA_PATH, 'utf-8');

  // Update disposable domains metadata
  const updatedContent = metadataContent
    .replace(
      /disposableDomains:\s*\{[^}]+\}/,
      `disposableDomains: {
    version: '1.0.0',
    lastUpdated: '${today}',
    count: ${count},
    source: 'https://github.com/disposable/disposable-email-domains',
    description: 'List of known disposable/temporary email domains',
  }`
    );

  fs.writeFileSync(METADATA_PATH, updatedContent);
  console.log(`Updated metadata: count=${count}, lastUpdated=${today}`);
}

async function main(): Promise<void> {
  console.log('Starting disposable domains update...\n');

  // Fetch domains from sources
  const domains = await fetchDomains();

  if (domains.size === 0) {
    console.error('No domains fetched. Aborting update.');
    process.exit(1);
  }

  console.log(`\nTotal unique domains: ${domains.size}`);

  // Read existing domains to check for changes
  const existingContent = fs.readFileSync(OUTPUT_PATH, 'utf-8');
  const existingMatch = existingContent.match(
    /const disposableDomainsList = \[([\s\S]*?)\];/
  );

  if (existingMatch) {
    const existingDomains = existingMatch[1]
      .split('\n')
      .map((line: string) => line.match(/'([^']+)'/)?.[1])
      .filter(Boolean) as string[];

    const added = [...domains].filter((d) => !existingDomains.includes(d));
    const removed = existingDomains.filter((d) => !domains.has(d));

    if (added.length > 0) {
      console.log(`\nNew domains (${added.length}):`);
      added.slice(0, 10).forEach((d) => console.log(`  + ${d}`));
      if (added.length > 10) {
        console.log(`  ... and ${added.length - 10} more`);
      }
    }

    if (removed.length > 0) {
      console.log(`\nRemoved domains (${removed.length}):`);
      removed.slice(0, 10).forEach((d) => console.log(`  - ${d}`));
      if (removed.length > 10) {
        console.log(`  ... and ${removed.length - 10} more`);
      }
    }

    if (added.length === 0 && removed.length === 0) {
      console.log('\nNo changes detected. File is up to date.');
      return;
    }
  }

  // Generate and write new file
  const domainArray = [...domains];
  const fileContent = generateFileContent(domainArray);
  fs.writeFileSync(OUTPUT_PATH, fileContent);
  console.log(`\nWrote ${domainArray.length} domains to ${OUTPUT_PATH}`);

  // Update metadata
  updateMetadata(domainArray.length);

  console.log('\nUpdate complete!');
}

main().catch((error) => {
  console.error('Update failed:', error);
  process.exit(1);
});
