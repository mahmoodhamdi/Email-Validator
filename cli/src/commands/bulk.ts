/**
 * Bulk email validation command
 */

import chalk from 'chalk';
import { validateEmail, ValidationResult } from '../validator';
import type { BulkOptions } from '../types';
import { readFile, parseEmails, writeFile, getFormatFromExtension } from '../utils/file';
import { ProgressTracker } from '../utils/progress';
import { printResultsTable, toCSV, printSummary } from '../utils/output';

/**
 * Execute bulk email validation from file
 */
export async function bulkCommand(file: string, options: BulkOptions): Promise<void> {
  try {
    // Read and parse file
    const content = readFile(file);
    const emails = parseEmails(content);

    if (emails.length === 0) {
      console.error(chalk.red('No valid emails found in file'));
      process.exit(1);
    }

    console.log(chalk.cyan(`\nFound ${emails.length} emails to validate\n`));

    // Validate emails
    const results = await validateBulk(emails, options);

    // Filter results
    const filtered = filterResults(results, options.filter);

    // Output results
    outputResults(filtered, options);

    // Print summary
    printSummary(results);

    // Exit with appropriate code
    const hasInvalid = results.some(r => !r.isValid);
    process.exit(hasInvalid ? 1 : 0);
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(2);
  }
}

/**
 * Validate emails in batches with concurrency control
 */
async function validateBulk(
  emails: string[],
  options: BulkOptions
): Promise<ValidationResult[]> {
  const concurrency = parseInt(options.concurrency, 10) || 10;
  const results: ValidationResult[] = [];
  const progress = new ProgressTracker(options.progress);

  progress.start(emails.length);

  // Process in batches
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (email) => {
        try {
          return await validateEmail(email);
        } catch (error) {
          return createErrorResult(email, error instanceof Error ? error.message : 'Unknown error');
        }
      })
    );

    results.push(...batchResults);
    progress.update(Math.min(i + concurrency, emails.length));
  }

  progress.stop();
  return results;
}

/**
 * Create an error result for failed validations
 */
function createErrorResult(email: string, errorMessage: string): ValidationResult {
  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    deliverability: 'unknown',
    risk: 'high',
    checks: {
      syntax: { valid: false, message: errorMessage },
      domain: { valid: false, exists: false, message: 'Skipped due to error' },
      mx: { valid: false, records: [], message: 'Skipped due to error' },
      disposable: { isDisposable: false, message: 'Skipped' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Filter results based on filter option
 */
function filterResults(
  results: ValidationResult[],
  filter: string
): ValidationResult[] {
  switch (filter) {
    case 'valid':
      return results.filter(r => r.isValid);
    case 'invalid':
      return results.filter(r => !r.isValid);
    case 'risky':
      return results.filter(r => r.risk === 'high' || r.deliverability === 'risky');
    default:
      return results;
  }
}

/**
 * Output results to console or file
 */
function outputResults(results: ValidationResult[], options: BulkOptions): void {
  // Determine format from output file extension if not explicitly set
  let format = options.format;
  if (options.output) {
    const detectedFormat = getFormatFromExtension(options.output);
    if (detectedFormat && format === 'table') {
      format = detectedFormat;
    }
  }

  if (options.output) {
    // Write to file
    let content: string;

    if (format === 'csv') {
      content = toCSV(results);
    } else {
      content = JSON.stringify(results, null, 2);
    }

    writeFile(options.output, content);
    console.log(chalk.green(`\nResults saved to: ${options.output}`));
  } else {
    // Print to console
    if (format === 'table') {
      printResultsTable(results);
    } else if (format === 'csv') {
      console.log(toCSV(results));
    } else {
      console.log(JSON.stringify(results, null, 2));
    }
  }
}
