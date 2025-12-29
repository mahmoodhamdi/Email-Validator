/**
 * Progress indicator utilities for CLI
 */

import cliProgress from 'cli-progress';
import chalk from 'chalk';

/**
 * Create a progress bar for bulk validation
 */
export function createProgressBar(): cliProgress.SingleBar {
  return new cliProgress.SingleBar({
    format: 'Validating |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} emails | ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
}

/**
 * Progress tracker class for managing progress state
 */
export class ProgressTracker {
  private bar: cliProgress.SingleBar | null = null;
  private enabled: boolean;
  private total: number = 0;
  private current: number = 0;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Start tracking progress
   */
  start(total: number): void {
    this.total = total;
    this.current = 0;

    if (this.enabled) {
      this.bar = createProgressBar();
      this.bar.start(total, 0);
    }
  }

  /**
   * Update progress
   */
  update(value: number): void {
    this.current = value;
    if (this.bar) {
      this.bar.update(value);
    }
  }

  /**
   * Increment progress by amount
   */
  increment(amount: number = 1): void {
    this.current = Math.min(this.current + amount, this.total);
    if (this.bar) {
      this.bar.update(this.current);
    }
  }

  /**
   * Stop tracking progress
   */
  stop(): void {
    if (this.bar) {
      this.bar.stop();
      this.bar = null;
    }
  }

  /**
   * Get current progress percentage
   */
  getPercentage(): number {
    return this.total > 0 ? (this.current / this.total) * 100 : 0;
  }
}
