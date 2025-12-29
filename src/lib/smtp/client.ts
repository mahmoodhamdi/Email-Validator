/**
 * SMTP Client for Email Verification
 *
 * Implements SMTP-level verification to check if a mailbox exists.
 * Handles greylisting, catch-all detection, and rate limiting.
 */

import net from 'net';
import { SMTPConfig, SMTPResult, RateLimitEntry } from './types';

/**
 * Default SMTP configuration
 */
const DEFAULT_CONFIG: SMTPConfig = {
  timeout: 10000,       // 10 seconds
  retries: 2,
  fromEmail: 'verify@email-validator.local',
  helo: 'email-validator.local',
  ports: [25, 587],     // Standard SMTP ports
};

/**
 * Rate limiting configuration
 */
const MAX_REQUESTS_PER_DOMAIN = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Rate limit tracking per domain
 */
const domainRateLimits = new Map<string, RateLimitEntry>();

/**
 * Simple LRU cache for SMTP results
 */
class SMTPCache {
  private cache = new Map<string, { result: SMTPResult; timestamp: number }>();
  private maxSize = 1000;
  private ttlMs = 5 * 60 * 1000; // 5 minutes
  private stats = { hits: 0, misses: 0 };

  get(key: string): SMTPResult | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.result;
  }

  set(key: string, result: SMTPResult): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }
}

const smtpCache = new SMTPCache();

/**
 * Verify if an email address exists via SMTP
 */
export async function verifySMTP(
  email: string,
  mxHosts: string[],
  config: Partial<SMTPConfig> = {}
): Promise<SMTPResult> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];
  const startTime = Date.now();

  // Check cache first
  const cached = smtpCache.get(normalizedEmail);
  if (cached) {
    return { ...cached, responseTime: 0 };
  }

  // Check rate limit
  if (!checkRateLimit(domain)) {
    return {
      exists: null,
      catchAll: false,
      greylisted: false,
      message: 'Rate limited for this domain',
      responseTime: Date.now() - startTime,
    };
  }

  // Try each MX host (limit to first 3)
  const hostsToTry = mxHosts.slice(0, 3);

  for (const mx of hostsToTry) {
    for (const port of fullConfig.ports) {
      for (let attempt = 0; attempt <= fullConfig.retries; attempt++) {
        try {
          const result = await attemptVerification(normalizedEmail, mx, port, fullConfig);

          // Cache successful results
          if (result.exists !== null || result.catchAll || result.greylisted) {
            smtpCache.set(normalizedEmail, result);
          }

          return {
            ...result,
            responseTime: Date.now() - startTime,
          };
        } catch (error) {
          // Try next attempt/host/port
          continue;
        }
      }
    }
  }

  // All attempts failed
  return {
    exists: null,
    catchAll: false,
    greylisted: false,
    message: 'Could not connect to mail server',
    responseTime: Date.now() - startTime,
  };
}

/**
 * Attempt SMTP verification on a specific host/port
 */
async function attemptVerification(
  email: string,
  host: string,
  port: number,
  config: SMTPConfig
): Promise<SMTPResult> {
  const domain = email.split('@')[1];

  return new Promise((resolve, reject) => {
    let resolved = false;

    const socket = net.createConnection({
      host,
      port,
      timeout: config.timeout,
    });

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
      }
      socket.removeAllListeners();
      socket.destroy();
    };

    const timeoutHandler = setTimeout(() => {
      cleanup();
      reject(new Error('Connection timeout'));
    }, config.timeout);

    /**
     * Send an SMTP command and wait for response
     */
    const sendCommand = (cmd: string): Promise<{ code: number; message: string }> => {
      return new Promise((cmdResolve, cmdReject) => {
        const cmdTimeout = setTimeout(() => {
          cmdReject(new Error('Command timeout'));
        }, config.timeout);

        socket.once('data', (data) => {
          clearTimeout(cmdTimeout);
          const msg = data.toString().trim();
          const code = parseInt(msg.substring(0, 3), 10);
          cmdResolve({ code, message: msg });
        });

        socket.write(cmd + '\r\n');
      });
    };

    /**
     * Wait for server greeting
     */
    const waitForGreeting = (): Promise<{ code: number; message: string }> => {
      return new Promise((greetResolve, greetReject) => {
        const greetTimeout = setTimeout(() => {
          greetReject(new Error('Greeting timeout'));
        }, config.timeout);

        socket.once('data', (data) => {
          clearTimeout(greetTimeout);
          const msg = data.toString().trim();
          const code = parseInt(msg.substring(0, 3), 10);
          greetResolve({ code, message: msg });
        });
      });
    };

    socket.on('connect', async () => {
      try {
        // Wait for server greeting (220)
        const greeting = await waitForGreeting();
        if (greeting.code !== 220) {
          cleanup();
          clearTimeout(timeoutHandler);
          reject(new Error(`Server not ready: ${greeting.code}`));
          return;
        }

        // EHLO command
        const ehlo = await sendCommand(`EHLO ${config.helo}`);
        if (ehlo.code !== 250) {
          // Try HELO as fallback
          const helo = await sendCommand(`HELO ${config.helo}`);
          if (helo.code !== 250) {
            cleanup();
            clearTimeout(timeoutHandler);
            reject(new Error(`HELO failed: ${helo.code}`));
            return;
          }
        }

        // MAIL FROM command
        const mailFrom = await sendCommand(`MAIL FROM:<${config.fromEmail}>`);
        if (mailFrom.code !== 250) {
          cleanup();
          clearTimeout(timeoutHandler);
          reject(new Error(`MAIL FROM failed: ${mailFrom.code}`));
          return;
        }

        // Check for catch-all by testing a random non-existent address
        const randomLocalPart = `test-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const randomEmail = `${randomLocalPart}@${domain}`;
        const catchAllCheck = await sendCommand(`RCPT TO:<${randomEmail}>`);
        const isCatchAll = catchAllCheck.code === 250 || catchAllCheck.code === 251;

        // Reset for actual check (some servers require this)
        await sendCommand('RSET');
        await sendCommand(`MAIL FROM:<${config.fromEmail}>`);

        // RCPT TO command for the actual email
        const rcptTo = await sendCommand(`RCPT TO:<${email}>`);
        const rcptCode = rcptTo.code;

        // QUIT
        try {
          await sendCommand('QUIT');
        } catch {
          // Ignore QUIT errors
        }

        cleanup();
        clearTimeout(timeoutHandler);

        // Interpret RCPT TO response
        if (rcptCode === 250 || rcptCode === 251) {
          resolved = true;
          resolve({
            exists: isCatchAll ? null : true,
            catchAll: isCatchAll,
            greylisted: false,
            message: isCatchAll
              ? 'Server accepts all addresses (catch-all)'
              : 'Mailbox exists',
            responseCode: rcptCode,
            responseTime: 0,
          });
        } else if (rcptCode === 550 || rcptCode === 551 || rcptCode === 553 || rcptCode === 554) {
          resolved = true;
          resolve({
            exists: false,
            catchAll: false,
            greylisted: false,
            message: 'Mailbox does not exist',
            responseCode: rcptCode,
            responseTime: 0,
          });
        } else if (rcptCode === 450 || rcptCode === 451 || rcptCode === 452) {
          resolved = true;
          resolve({
            exists: null,
            catchAll: false,
            greylisted: true,
            message: 'Temporary failure (possibly greylisting)',
            responseCode: rcptCode,
            responseTime: 0,
          });
        } else if (rcptCode === 252) {
          resolved = true;
          resolve({
            exists: null,
            catchAll: false,
            greylisted: false,
            message: 'Cannot verify user, but server will accept',
            responseCode: rcptCode,
            responseTime: 0,
          });
        } else {
          resolved = true;
          resolve({
            exists: null,
            catchAll: isCatchAll,
            greylisted: false,
            message: `Unknown response code: ${rcptCode}`,
            responseCode: rcptCode,
            responseTime: 0,
          });
        }
      } catch (error) {
        cleanup();
        clearTimeout(timeoutHandler);
        reject(error);
      }
    });

    socket.on('error', (err) => {
      cleanup();
      clearTimeout(timeoutHandler);
      reject(err);
    });

    socket.on('timeout', () => {
      cleanup();
      clearTimeout(timeoutHandler);
      reject(new Error('Socket timeout'));
    });

    socket.on('close', () => {
      if (!resolved) {
        clearTimeout(timeoutHandler);
        reject(new Error('Connection closed'));
      }
    });
  });
}

/**
 * Check if a domain is rate limited
 */
function checkRateLimit(domain: string): boolean {
  const now = Date.now();
  const limit = domainRateLimits.get(domain);

  if (!limit || now > limit.resetAt) {
    domainRateLimits.set(domain, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_DOMAIN) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Get SMTP cache statistics
 */
export function getSMTPCacheStats() {
  return smtpCache.getStats();
}

/**
 * Clear SMTP cache
 */
export function clearSMTPCache() {
  smtpCache.clear();
}

/**
 * Reset rate limits (for testing)
 */
export function resetRateLimits() {
  domainRateLimits.clear();
}
