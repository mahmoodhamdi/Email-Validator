/**
 * Marketing capture — Email Validator.
 * Uses system Chrome via Playwright.
 *
 * Default: http://localhost:3007
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const shotsDir = path.join(projectRoot, 'marketing', 'screenshots');
const videosDir = path.join(projectRoot, 'marketing', 'videos');
const BASE = process.env.BASE_URL || 'http://localhost:3007';

await fs.mkdir(shotsDir, { recursive: true });
await fs.mkdir(videosDir, { recursive: true });

const desktop = { width: 1920, height: 1080 };
const tablet = { width: 1024, height: 768 };
const mobile = { width: 390, height: 844 };

async function shot(page, name) {
  const file = path.join(shotsDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  + ${path.relative(projectRoot, file)}`);
}

async function runOnce(page, name, email) {
  const input = page.locator('input[type="email"], input[type="text"]').first();
  await input.fill(email);
  await page.waitForTimeout(2000);
  await shot(page, name);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  console.log('\n=== Email Validator SCREENSHOTS ===');
  console.log('\n[desktop]');
  {
    const ctx = await browser.newContext({ viewport: desktop });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '01-desktop-home');

    await runOnce(page, '02-desktop-valid-result', 'mahmoud@gmail.com');
    await runOnce(page, '03-desktop-disposable-result', 'test@10minutemail.com');

    await page.goto(`${BASE}/bulk`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '04-desktop-bulk');

    await ctx.close();
  }

  console.log('\n[tablet]');
  {
    const ctx = await browser.newContext({ viewport: tablet });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '05-tablet-home');
    await ctx.close();
  }

  console.log('\n[mobile]');
  {
    const ctx = await browser.newContext({
      viewport: mobile, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '06-mobile-home');
    await runOnce(page, '07-mobile-result', 'test@example.com');
    await page.goto(`${BASE}/bulk`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, '08-mobile-bulk');
    await ctx.close();
  }

  console.log('\n=== walkthrough video ===');
  {
    const ctx = await browser.newContext({
      viewport: desktop,
      recordVideo: { dir: videosDir, size: desktop },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2500);
    const input = page.locator('input[type="email"], input[type="text"]').first();
    await input.click();
    for (const email of ['admin@gmail.com', 'test@10minutemail.com', 'mahmoud@yahoo.com']) {
      await input.fill('');
      await input.type(email, { delay: 80 });
      await page.waitForTimeout(3500);
    }
    await page.goto(`${BASE}/bulk`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(4000);
    await ctx.close();
    console.log('  + walkthrough webm');
  }
} finally {
  await browser.close();
}
console.log('\nDone.');
