/**
 * Output formatting utilities for CLI
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import type { ValidationResult } from '../validator';

/**
 * Get colored string based on score value
 */
export function getScoreColor(score: number): (text: string) => string {
  if (score >= 80) return (text: string) => chalk.green(text);
  if (score >= 50) return (text: string) => chalk.yellow(text);
  return (text: string) => chalk.red(text);
}

/**
 * Get colored string based on risk level
 */
export function getRiskColor(risk: string): (text: string) => string {
  switch (risk) {
    case 'low': return (text: string) => chalk.green(text);
    case 'medium': return (text: string) => chalk.yellow(text);
    case 'high': return (text: string) => chalk.red(text);
    default: return (text: string) => text;
  }
}

/**
 * Get status icon
 */
export function getStatusIcon(valid: boolean): string {
  return valid ? chalk.green('✓') : chalk.red('✗');
}

/**
 * Print simple result format
 */
export function printSimpleResult(result: ValidationResult, verbose: boolean): void {
  const status = result.isValid
    ? chalk.green('✓ VALID')
    : chalk.red('✗ INVALID');

  console.log(`\n${result.email}: ${status}`);
  console.log(`Score: ${getScoreColor(result.score)(result.score.toString())}/100`);
  console.log(`Deliverability: ${result.deliverability}`);
  console.log(`Risk: ${getRiskColor(result.risk)(result.risk)}`);

  if (verbose) {
    console.log('\n' + chalk.bold('Checks:'));
    printChecks(result);
  }
}

/**
 * Print result in table format
 */
export function printTableResult(result: ValidationResult, verbose: boolean): void {
  const table = new Table({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
  });

  table.push(
    ['Email', result.email],
    ['Valid', result.isValid ? chalk.green('Yes') : chalk.red('No')],
    ['Score', `${getScoreColor(result.score)(result.score.toString())}/100`],
    ['Deliverability', result.deliverability],
    ['Risk', getRiskColor(result.risk)(result.risk)]
  );

  console.log(table.toString());

  if (verbose) {
    const checksTable = new Table({
      head: [chalk.cyan('Check'), chalk.cyan('Result'), chalk.cyan('Details')],
    });

    const { checks } = result;
    checksTable.push(
      ['Syntax', getStatusIcon(checks.syntax.valid), checks.syntax.message],
      ['Domain', getStatusIcon(checks.domain.valid), checks.domain.message],
      ['MX Records', getStatusIcon(checks.mx.valid), checks.mx.message],
      ['Disposable', checks.disposable.isDisposable ? chalk.yellow('Yes') : chalk.green('No'), checks.disposable.message],
      ['Role-based', checks.roleBased.isRoleBased ? chalk.yellow('Yes') : chalk.green('No'), checks.roleBased.role || '-'],
      ['Free Provider', checks.freeProvider.isFree ? 'Yes' : 'No', checks.freeProvider.provider || '-'],
      ['Typo', checks.typo.hasTypo ? chalk.yellow('Yes') : chalk.green('No'), checks.typo.suggestion || '-']
    );

    console.log('\n' + chalk.bold('Validation Checks:'));
    console.log(checksTable.toString());
  }
}

/**
 * Print individual checks
 */
export function printChecks(result: ValidationResult): void {
  const { checks } = result;

  console.log(`  ${getStatusIcon(checks.syntax.valid)} Syntax: ${checks.syntax.message}`);
  console.log(`  ${getStatusIcon(checks.domain.valid)} Domain: ${checks.domain.message}`);
  console.log(`  ${getStatusIcon(checks.mx.valid)} MX: ${checks.mx.message}`);
  console.log(`  ${getStatusIcon(!checks.disposable.isDisposable)} Disposable: ${checks.disposable.message}`);
  console.log(`  ${getStatusIcon(!checks.roleBased.isRoleBased)} Role-based: ${checks.roleBased.role || 'Not role-based'}`);
  console.log(`  ℹ Free Provider: ${checks.freeProvider.provider || 'Not a free provider'}`);

  if (checks.typo.hasTypo) {
    console.log(chalk.yellow(`  ⚠ Typo detected: Did you mean ${checks.typo.suggestion}?`));
  }
}

/**
 * Print results table for bulk validation
 */
export function printResultsTable(results: ValidationResult[]): void {
  const table = new Table({
    head: [
      chalk.cyan('Email'),
      chalk.cyan('Valid'),
      chalk.cyan('Score'),
      chalk.cyan('Risk'),
      chalk.cyan('Deliverability')
    ],
    colWidths: [40, 8, 8, 10, 15],
  });

  for (const result of results.slice(0, 50)) {
    table.push([
      result.email.length > 38 ? result.email.substring(0, 35) + '...' : result.email,
      result.isValid ? chalk.green('✓') : chalk.red('✗'),
      result.score.toString(),
      getRiskColor(result.risk)(result.risk),
      result.deliverability
    ]);
  }

  console.log(table.toString());

  if (results.length > 50) {
    console.log(chalk.yellow(`\n... and ${results.length - 50} more results`));
  }
}

/**
 * Convert results to CSV format
 */
export function toCSV(results: ValidationResult[]): string {
  const headers = ['email', 'isValid', 'score', 'deliverability', 'risk', 'disposable', 'freeProvider'];
  const rows = results.map(r => [
    `"${r.email}"`,
    r.isValid,
    r.score,
    r.deliverability,
    r.risk,
    r.checks?.disposable?.isDisposable || false,
    r.checks?.freeProvider?.provider || ''
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Print summary statistics
 */
export function printSummary(results: ValidationResult[]): void {
  const valid = results.filter(r => r.isValid).length;
  const invalid = results.length - valid;
  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 0;

  const riskCounts = {
    low: results.filter(r => r.risk === 'low').length,
    medium: results.filter(r => r.risk === 'medium').length,
    high: results.filter(r => r.risk === 'high').length,
  };

  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`  Total: ${results.length}`);
  console.log(`  ${chalk.green('Valid')}: ${valid} (${((valid / results.length) * 100).toFixed(1)}%)`);
  console.log(`  ${chalk.red('Invalid')}: ${invalid} (${((invalid / results.length) * 100).toFixed(1)}%)`);
  console.log(`  Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(chalk.bold('\n📈 Risk Distribution:'));
  console.log(`  ${chalk.green('Low')}: ${riskCounts.low}`);
  console.log(`  ${chalk.yellow('Medium')}: ${riskCounts.medium}`);
  console.log(`  ${chalk.red('High')}: ${riskCounts.high}`);
}
