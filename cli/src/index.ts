#!/usr/bin/env node

/**
 * Email Validator CLI
 * Command-line tool for validating email addresses
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate';
import { bulkCommand } from './commands/bulk';

const program = new Command();

program
  .name('email-validator')
  .description('CLI tool for validating email addresses')
  .version('1.0.0');

// Single email validation
program
  .command('validate <email>')
  .alias('v')
  .description('Validate a single email address')
  .option('-f, --format <format>', 'Output format: json, table, simple', 'simple')
  .option('-v, --verbose', 'Show detailed validation checks', false)
  .action(validateCommand);

// Bulk validation from file
program
  .command('bulk <file>')
  .alias('b')
  .description('Validate emails from a file (one per line, or CSV)')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Output format: json, csv, table', 'table')
  .option('--filter <filter>', 'Filter results: all, valid, invalid, risky', 'all')
  .option('--no-progress', 'Disable progress bar')
  .option('-c, --concurrency <number>', 'Concurrent validations', '10')
  .action(bulkCommand);

// Show examples
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.bold('\nUsage Examples:\n'));

    console.log(chalk.cyan('  # Validate a single email'));
    console.log('  $ email-validator validate user@example.com\n');

    console.log(chalk.cyan('  # Validate with detailed output'));
    console.log('  $ email-validator validate user@gmail.com --verbose\n');

    console.log(chalk.cyan('  # Output as JSON'));
    console.log('  $ email-validator validate user@gmail.com -f json\n');

    console.log(chalk.cyan('  # Bulk validate from file'));
    console.log('  $ email-validator bulk emails.txt\n');

    console.log(chalk.cyan('  # Bulk validate and export to CSV'));
    console.log('  $ email-validator bulk emails.txt -o results.csv\n');

    console.log(chalk.cyan('  # Bulk validate and export to JSON'));
    console.log('  $ email-validator bulk emails.txt -o results.json\n');

    console.log(chalk.cyan('  # Only show valid emails'));
    console.log('  $ email-validator bulk emails.txt --filter valid\n');

    console.log(chalk.cyan('  # Show invalid or risky emails'));
    console.log('  $ email-validator bulk emails.txt --filter risky\n');

    console.log(chalk.cyan('  # Increase concurrency for faster processing'));
    console.log('  $ email-validator bulk emails.txt -c 20\n');

    console.log(chalk.cyan('  # Use short aliases'));
    console.log('  $ ev v user@example.com');
    console.log('  $ ev b emails.txt\n');
  });

// Default action for unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`\nInvalid command: ${program.args.join(' ')}`));
  console.log(`Run ${chalk.cyan('email-validator --help')} for usage information.\n`);
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
