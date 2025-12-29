/**
 * Single email validation command
 */

import chalk from 'chalk';
import ora from 'ora';
import { validateEmail } from '../validator';
import type { ValidateOptions } from '../types';
import { printSimpleResult, printTableResult } from '../utils/output';

/**
 * Execute single email validation
 */
export async function validateCommand(email: string, options: ValidateOptions): Promise<void> {
  const spinner = ora(`Validating ${chalk.cyan(email)}...`).start();

  try {
    const result = await validateEmail(email);
    spinner.stop();

    switch (options.format) {
      case 'json':
        console.log(JSON.stringify(result, null, 2));
        break;
      case 'table':
        printTableResult(result, options.verbose);
        break;
      case 'simple':
      default:
        printSimpleResult(result, options.verbose);
    }

    // Exit with appropriate code
    process.exit(result.isValid ? 0 : 1);
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(2);
  }
}
