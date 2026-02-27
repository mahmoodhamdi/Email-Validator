const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================
// QA TEST RUNNER WITH PUPPETEER
// Email Validator - Comprehensive Testing
// ============================================

class QATestRunner {
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      screenshotDir: config.screenshotDir || './qa-screenshots',
      slowMo: config.slowMo || 50,
      headless: false,
      defaultTimeout: 30000,
      ...config
    };
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.bugReports = [];
    this.startTime = Date.now();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async init() {
    console.log('🎭 Launching visible browser...');

    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      headless: false,
      slowMo: this.config.slowMo,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--start-maximized',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out common non-critical errors
        if (!text.includes('favicon') && !text.includes('404')) {
          console.log('❌ Console Error:', text);
          this.bugReports.push({
            type: 'console_error',
            message: text,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Monitor network failures
    this.page.on('requestfailed', request => {
      const url = request.url();
      if (!url.includes('favicon') && !url.includes('google-analytics')) {
        console.log('❌ Network Error:', url);
        this.bugReports.push({
          type: 'network_error',
          url: url,
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log('✅ Browser ready!');
  }

  // ============================================
  // SCREENSHOT HELPERS
  // ============================================

  async screenshot(name) {
    const filename = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '-')}.png`;
    const filepath = path.join(this.config.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot: ${filename}`);
    return filepath;
  }

  // ============================================
  // ACTION HELPERS
  // ============================================

  async goto(url, name = '') {
    console.log(`🌐 Navigating to: ${url}`);
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.defaultTimeout });
      await this.wait(1000);
      await this.screenshot(`page-${name || 'navigate'}`);
      return true;
    } catch (error) {
      console.log(`⚠️ Navigation error: ${error.message}`);
      this.bugReports.push({
        type: 'navigation_error',
        url: url,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async click(selector, description = '') {
    console.log(`👆 Clicking: ${description || selector}`);
    try {
      await this.highlight(selector);
      await this.page.click(selector);
      await this.wait(500);
      return true;
    } catch (error) {
      console.log(`⚠️ Click failed: ${error.message}`);
      return false;
    }
  }

  async type(selector, text, description = '') {
    console.log(`⌨️ Typing in ${description || selector}: "${text.substring(0, 30)}..."`);
    try {
      await this.highlight(selector);
      await this.page.click(selector, { clickCount: 3 }); // Select all
      await this.page.type(selector, text, { delay: 30 });
      return true;
    } catch (error) {
      console.log(`⚠️ Type failed: ${error.message}`);
      return false;
    }
  }

  async wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForSelector(selector, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // VISUAL HIGHLIGHTING
  // ============================================

  async highlight(selector, color = 'red') {
    try {
      await this.page.evaluate((sel, col) => {
        const element = document.querySelector(sel);
        if (element) {
          element.style.outline = `3px solid ${col}`;
          element.style.outlineOffset = '2px';
          setTimeout(() => {
            element.style.outline = '';
            element.style.outlineOffset = '';
          }, 1500);
        }
      }, selector, color);
      await this.wait(200);
    } catch {
      // Element might not exist
    }
  }

  async showMessage(message, duration = 2000) {
    await this.page.evaluate((msg, dur) => {
      const div = document.createElement('div');
      div.textContent = msg;
      div.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #000;
        color: #0f0;
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 18px;
        font-family: monospace;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0,255,0,0.3);
      `;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), dur);
    }, message, duration);
    await this.wait(duration);
  }

  // ============================================
  // TEST: HOME PAGE - SINGLE EMAIL VALIDATION
  // ============================================

  async testHomePage() {
    console.log('\n' + '='.repeat(50));
    console.log('📧 TESTING: Home Page - Single Email Validation');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/`, 'home');
    await this.showMessage('🏠 Testing Home Page');

    const tests = [];

    // Test 1: Page loads correctly
    const hasTitle = await this.page.$('h1');
    tests.push({ name: 'Page loads with title', passed: !!hasTitle });

    // Test 2: Email input exists
    const emailInput = await this.page.$('input[type="email"]');
    tests.push({ name: 'Email input exists', passed: !!emailInput });

    // Test 3: Validate button exists
    const validateButton = await this.page.$('button[type="submit"]');
    tests.push({ name: 'Validate button exists', passed: !!validateButton });

    // Test 4: Real-time toggle exists
    const realTimeToggle = await this.page.$('#real-time');
    tests.push({ name: 'Real-time toggle exists', passed: !!realTimeToggle });

    // Test 5: Valid email validation
    console.log('\n📝 Testing valid email...');
    await this.type('input[type="email"]', 'test@gmail.com', 'Email input');
    await this.screenshot('home-valid-email-entered');
    await this.click('button[type="submit"]', 'Validate button');
    await this.wait(3000);
    await this.screenshot('home-valid-email-result');

    // Check if result card appeared
    const resultExists = await this.page.$('.bg-green-500, .text-green-500, [class*="green"]');
    tests.push({ name: 'Valid email shows success', passed: !!resultExists });

    // Test 6: Invalid email validation
    console.log('\n📝 Testing invalid email...');
    await this.type('input[type="email"]', 'not-an-email', 'Email input');
    await this.wait(500);
    const hasError = await this.page.$('.text-destructive, [class*="red"], .text-red');
    tests.push({ name: 'Invalid email shows error', passed: !!hasError });

    // Test 7: Clear and test disposable email
    console.log('\n📝 Testing disposable email...');
    await this.type('input[type="email"]', 'test@tempmail.com', 'Email input');
    await this.click('button[type="submit"]', 'Validate button');
    await this.wait(3000);
    await this.screenshot('home-disposable-email-result');

    // Test 8: Typo detection
    console.log('\n📝 Testing typo detection...');
    await this.type('input[type="email"]', 'test@gmial.com', 'Email input');
    await this.click('button[type="submit"]', 'Validate button');
    await this.wait(3000);
    await this.screenshot('home-typo-suggestion');
    const typoSuggestion = await this.page.$('[class*="yellow"], .text-yellow');
    tests.push({ name: 'Typo suggestion appears', passed: !!typoSuggestion });

    this.testResults.push({
      page: 'Home',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: BULK VALIDATION PAGE
  // ============================================

  async testBulkPage() {
    console.log('\n' + '='.repeat(50));
    console.log('📦 TESTING: Bulk Validation Page');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/bulk`, 'bulk');
    await this.showMessage('📦 Testing Bulk Validation');

    const tests = [];

    // Test 1: Page loads
    const hasTitle = await this.page.$('h1');
    tests.push({ name: 'Page loads with title', passed: !!hasTitle });

    // Test 2: Textarea exists
    const textarea = await this.page.$('textarea');
    tests.push({ name: 'Textarea exists', passed: !!textarea });

    // Test 3: Upload button exists
    const uploadButton = await this.page.$('button');
    tests.push({ name: 'Upload button exists', passed: !!uploadButton });

    // Test 4: Paste emails and validate
    console.log('\n📝 Testing bulk email paste...');
    const testEmails = `test1@gmail.com
test2@yahoo.com
invalid-email
admin@example.com
test@gmial.com`;

    await this.type('textarea', testEmails, 'Email textarea');
    await this.screenshot('bulk-emails-entered');

    // Find and click validate button
    const validateBtn = await this.page.$('button:not([variant="outline"])');
    if (validateBtn) {
      await this.click('button:not([variant="outline"])', 'Validate All button');
      await this.wait(5000);
      await this.screenshot('bulk-validation-results');
    }

    // Test 5: Check if results appear
    const results = await this.page.$$('.rounded-lg');
    tests.push({ name: 'Results displayed', passed: results.length > 3 });

    // Test 6: Check filter functionality
    const filterSelect = await this.page.$('button[role="combobox"]');
    if (filterSelect) {
      await this.click('button[role="combobox"]', 'Filter dropdown');
      await this.wait(500);
      await this.screenshot('bulk-filter-open');
      await this.page.keyboard.press('Escape');
    }
    tests.push({ name: 'Filter exists', passed: !!filterSelect });

    // Test 7: Clear button
    const clearButton = await this.page.$('button:has-text("Clear")');
    tests.push({ name: 'Clear button exists', passed: !!clearButton });

    this.testResults.push({
      page: 'Bulk Validation',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: HISTORY PAGE
  // ============================================

  async testHistoryPage() {
    console.log('\n' + '='.repeat(50));
    console.log('📜 TESTING: History Page');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/history`, 'history');
    await this.showMessage('📜 Testing History Page');

    const tests = [];

    // Test 1: Page loads
    const hasTitle = await this.page.$('h1');
    tests.push({ name: 'Page loads with title', passed: !!hasTitle });
    await this.screenshot('history-page');

    // Test 2: Check if history items exist or empty state
    const historyItems = await this.page.$$('.rounded-lg, [class*="card"]');
    tests.push({ name: 'History section exists', passed: historyItems.length > 0 });

    this.testResults.push({
      page: 'History',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: TOOLS PAGE
  // ============================================

  async testToolsPage() {
    console.log('\n' + '='.repeat(50));
    console.log('🔧 TESTING: Tools Page');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/tools/clean`, 'tools');
    await this.showMessage('🔧 Testing Tools Page');

    const tests = [];

    // Test 1: Page loads
    const hasTitle = await this.page.$('h1');
    tests.push({ name: 'Page loads with title', passed: !!hasTitle });

    // Test 2: Tabs exist
    const tabs = await this.page.$$('[role="tab"]');
    tests.push({ name: 'Tabs exist', passed: tabs.length >= 2 });

    // Test 3: Clean List tab
    await this.screenshot('tools-clean-tab');

    // Test 4: Click Merge Lists tab
    const mergeTab = await this.page.$('[role="tab"]:nth-child(2)');
    if (mergeTab) {
      await mergeTab.click();
      await this.wait(500);
      await this.screenshot('tools-merge-tab');
    }
    tests.push({ name: 'Merge tab clickable', passed: !!mergeTab });

    this.testResults.push({
      page: 'Tools',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: API DOCS PAGE
  // ============================================

  async testApiDocsPage() {
    console.log('\n' + '='.repeat(50));
    console.log('📚 TESTING: API Docs Page');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/api-docs`, 'api-docs');
    await this.showMessage('📚 Testing API Docs');

    const tests = [];

    // Test 1: Page loads
    await this.wait(2000); // Swagger UI takes time to load
    await this.screenshot('api-docs-page');

    const swaggerUI = await this.page.$('.swagger-ui, #swagger-ui');
    tests.push({ name: 'Swagger UI loads', passed: !!swaggerUI });

    this.testResults.push({
      page: 'API Docs',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: ANALYTICS PAGE
  // ============================================

  async testAnalyticsPage() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TESTING: Analytics Page');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/analytics`, 'analytics');
    await this.showMessage('📊 Testing Analytics');

    const tests = [];

    // Test 1: Page loads
    const hasContent = await this.page.$('h1, h2, .card');
    tests.push({ name: 'Page loads with content', passed: !!hasContent });
    await this.screenshot('analytics-page');

    this.testResults.push({
      page: 'Analytics',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: THEME TOGGLE
  // ============================================

  async testThemeToggle() {
    console.log('\n' + '='.repeat(50));
    console.log('🌙 TESTING: Theme Toggle');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/`, 'theme-test');
    await this.showMessage('🌙 Testing Theme Toggle');

    const tests = [];

    // Get initial theme
    const initialDark = await this.page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    await this.screenshot('theme-before');

    // Find and click theme toggle (button with moon/sun icon)
    const themeButton = await this.page.$('button:has(svg)');
    if (themeButton) {
      await themeButton.click();
      await this.wait(500);
      await this.screenshot('theme-after-toggle');

      const afterDark = await this.page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      tests.push({ name: 'Theme toggles', passed: initialDark !== afterDark });

      // Toggle back
      await themeButton.click();
      await this.wait(500);
    } else {
      tests.push({ name: 'Theme toggle button exists', passed: false });
    }

    this.testResults.push({
      page: 'Theme Toggle',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: LANGUAGE SWITCH
  // ============================================

  async testLanguageSwitch() {
    console.log('\n' + '='.repeat(50));
    console.log('🌐 TESTING: Language Switch');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/`, 'language-test');
    await this.showMessage('🌐 Testing Language Switch');

    const tests = [];

    // Find language switcher (globe icon button)
    const buttons = await this.page.$$('header button');
    let langButton = null;

    for (const btn of buttons) {
      const hasGlobe = await btn.$('svg');
      if (hasGlobe) {
        langButton = btn;
        break;
      }
    }

    if (langButton) {
      await this.screenshot('language-before');
      await langButton.click();
      await this.wait(500);
      await this.screenshot('language-dropdown-open');

      // Check if dropdown opened
      const dropdown = await this.page.$('[role="menu"], [role="menuitem"]');
      tests.push({ name: 'Language dropdown opens', passed: !!dropdown });

      // Click Arabic if available
      const arabicOption = await this.page.$('[role="menuitem"]:last-child');
      if (arabicOption) {
        await arabicOption.click();
        await this.wait(1000);
        await this.screenshot('language-arabic');

        // Check RTL
        const isRTL = await this.page.evaluate(() =>
          document.documentElement.dir === 'rtl' ||
          getComputedStyle(document.body).direction === 'rtl'
        );
        tests.push({ name: 'RTL applied for Arabic', passed: isRTL });

        // Switch back to English
        await langButton.click();
        await this.wait(500);
        const englishOption = await this.page.$('[role="menuitem"]:first-child');
        if (englishOption) {
          await englishOption.click();
          await this.wait(1000);
        }
      }
    } else {
      tests.push({ name: 'Language switcher exists', passed: false });
    }

    this.testResults.push({
      page: 'Language Switch',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: RESPONSIVE DESIGN
  // ============================================

  async testResponsive() {
    console.log('\n' + '='.repeat(50));
    console.log('📱 TESTING: Responsive Design');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/`, 'responsive');
    await this.showMessage('📱 Testing Responsive');

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-full' },
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 414, height: 896, name: 'mobile-large' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    const tests = [];

    for (const vp of viewports) {
      console.log(`   Testing viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await this.page.setViewport({ width: vp.width, height: vp.height });
      await this.wait(500);
      await this.screenshot(`responsive-${vp.name}`);

      // Check if main content is visible
      const mainContent = await this.page.$('main, .container, h1');
      tests.push({ name: `Viewport ${vp.name} renders`, passed: !!mainContent });
    }

    // Reset to desktop
    await this.page.setViewport({ width: 1920, height: 1080 });

    this.testResults.push({
      page: 'Responsive Design',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: API ENDPOINTS
  // ============================================

  async testAPIEndpoints() {
    console.log('\n' + '='.repeat(50));
    console.log('🔌 TESTING: API Endpoints');
    console.log('='.repeat(50));

    const tests = [];

    // Test health endpoint
    console.log('\n📍 Testing /api/health...');
    try {
      const healthResponse = await this.page.evaluate(async () => {
        const res = await fetch('/api/health');
        return { status: res.status, ok: res.ok };
      });
      tests.push({ name: 'GET /api/health', passed: healthResponse.ok });
    } catch (error) {
      tests.push({ name: 'GET /api/health', passed: false });
    }

    // Test validate endpoint
    console.log('\n📍 Testing POST /api/validate...');
    try {
      const validateResponse = await this.page.evaluate(async () => {
        const res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@gmail.com' })
        });
        return { status: res.status, ok: res.ok };
      });
      tests.push({ name: 'POST /api/validate', passed: validateResponse.ok });
    } catch (error) {
      tests.push({ name: 'POST /api/validate', passed: false });
    }

    // Test bulk endpoint
    console.log('\n📍 Testing POST /api/validate-bulk...');
    try {
      const bulkResponse = await this.page.evaluate(async () => {
        const res = await fetch('/api/validate-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: ['test@gmail.com', 'test@yahoo.com'] })
        });
        return { status: res.status, ok: res.ok };
      });
      tests.push({ name: 'POST /api/validate-bulk', passed: bulkResponse.ok });
    } catch (error) {
      tests.push({ name: 'POST /api/validate-bulk', passed: false });
    }

    this.testResults.push({
      page: 'API Endpoints',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // TEST: NAVIGATION
  // ============================================

  async testNavigation() {
    console.log('\n' + '='.repeat(50));
    console.log('🧭 TESTING: Navigation');
    console.log('='.repeat(50));

    await this.goto(`${this.config.baseUrl}/`, 'navigation');
    await this.showMessage('🧭 Testing Navigation');

    const tests = [];

    // Get all nav links
    const navLinks = await this.page.$$('header nav a');
    console.log(`Found ${navLinks.length} navigation links`);
    tests.push({ name: 'Nav links exist', passed: navLinks.length >= 5 });

    // Test each nav link
    const linkHrefs = await this.page.$$eval('header nav a', links =>
      links.map(link => ({ href: link.getAttribute('href'), text: link.textContent }))
    );

    for (const link of linkHrefs) {
      if (link.href && link.href.startsWith('/')) {
        console.log(`\n   Testing nav to: ${link.href}`);
        try {
          await this.page.click(`header nav a[href="${link.href}"]`);
          await this.wait(1500);
          const currentUrl = this.page.url();
          const success = currentUrl.includes(link.href) || link.href === '/';
          tests.push({ name: `Nav to ${link.href}`, passed: success });
          await this.screenshot(`nav-${link.href.replace(/\//g, '-') || 'home'}`);
        } catch (error) {
          tests.push({ name: `Nav to ${link.href}`, passed: false });
        }
      }
    }

    this.testResults.push({
      page: 'Navigation',
      tests: tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    });

    return tests;
  }

  // ============================================
  // GENERATE REPORT
  // ============================================

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    let totalPassed = 0;
    let totalFailed = 0;

    for (const result of this.testResults) {
      totalPassed += result.passed || 0;
      totalFailed += result.failed || 0;
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration} seconds`,
      summary: {
        totalTests: totalPassed + totalFailed,
        passed: totalPassed,
        failed: totalFailed,
        passRate: `${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`,
        bugs: this.bugReports.length
      },
      results: this.testResults,
      bugs: this.bugReports
    };

    // Save JSON report
    fs.writeFileSync(
      path.join(this.config.screenshotDir, 'qa-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Save HTML report
    const html = this.generateHTMLReport(report);
    fs.writeFileSync(
      path.join(this.config.screenshotDir, 'qa-report.html'),
      html
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 QA TESTING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`Duration: ${duration} seconds`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    console.log(`🐛 Bugs: ${report.summary.bugs}`);
    console.log('='.repeat(60));
    console.log(`📁 Screenshots: ${this.config.screenshotDir}`);
    console.log(`📄 JSON Report: ${this.config.screenshotDir}/qa-report.json`);
    console.log(`🌐 HTML Report: ${this.config.screenshotDir}/qa-report.html`);

    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Test Report - Email Validator</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      text-align: center;
      padding: 30px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { color: #aaa; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      transition: transform 0.3s;
    }
    .card:hover { transform: translateY(-5px); }
    .card h3 { font-size: 2.5em; margin-bottom: 5px; }
    .card.pass { border-left: 4px solid #00ff88; }
    .card.fail { border-left: 4px solid #ff4444; }
    .card.total { border-left: 4px solid #00aaff; }
    .card.bug { border-left: 4px solid #ffaa00; }
    .section {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
    }
    .section h2 { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .test-group { margin-bottom: 20px; }
    .test-group h3 {
      font-size: 1.1em;
      margin-bottom: 10px;
      color: #00aaff;
    }
    .test-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .test-item .status { font-weight: bold; }
    .test-item .status.pass { color: #00ff88; }
    .test-item .status.fail { color: #ff4444; }
    .bug-item {
      background: rgba(255,170,0,0.1);
      border-left: 3px solid #ffaa00;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 0 8px 8px 0;
    }
    .bug-item strong { color: #ffaa00; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 QA Test Report</h1>
      <p>Email Validator - Comprehensive Testing</p>
      <p style="margin-top: 10px; color: #666;">${report.timestamp}</p>
      <p style="color: #00aaff;">Duration: ${report.duration}</p>
    </div>

    <div class="summary">
      <div class="card total">
        <h3>${report.summary.totalTests}</h3>
        <p>Total Tests</p>
      </div>
      <div class="card pass">
        <h3>${report.summary.passed}</h3>
        <p>Passed</p>
      </div>
      <div class="card fail">
        <h3>${report.summary.failed}</h3>
        <p>Failed</p>
      </div>
      <div class="card bug">
        <h3>${report.summary.bugs}</h3>
        <p>Bugs Found</p>
      </div>
    </div>

    <div class="section">
      <h2>📋 Test Results</h2>
      ${report.results.map(group => `
        <div class="test-group">
          <h3>${group.page}</h3>
          ${group.tests.map(test => `
            <div class="test-item">
              <span>${test.name}</span>
              <span class="status ${test.passed ? 'pass' : 'fail'}">${test.passed ? '✅ PASS' : '❌ FAIL'}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    ${report.bugs.length > 0 ? `
    <div class="section">
      <h2>🐛 Bugs Found</h2>
      ${report.bugs.map(bug => `
        <div class="bug-item">
          <strong>${bug.type.toUpperCase()}</strong>
          <p>${bug.message || bug.url}</p>
          <p style="color: #666; font-size: 0.8em;">${bug.timestamp}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by QA Test Runner | Puppeteer</p>
      <p>Pass Rate: ${report.summary.passRate}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // ============================================
  // CLEANUP
  // ============================================

  async close() {
    console.log('\n🔒 Closing browser...');
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function runTests() {
  const qa = new QATestRunner({
    baseUrl: 'http://localhost:3000',
    screenshotDir: './qa-screenshots',
    slowMo: 50
  });

  try {
    await qa.init();

    // Run all tests
    await qa.testNavigation();
    await qa.testHomePage();
    await qa.testBulkPage();
    await qa.testHistoryPage();
    await qa.testToolsPage();
    await qa.testApiDocsPage();
    await qa.testAnalyticsPage();
    await qa.testThemeToggle();
    await qa.testLanguageSwitch();
    await qa.testResponsive();
    await qa.testAPIEndpoints();

    // Generate report
    qa.generateReport();

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    console.log('\n⏳ Browser will close in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await qa.close();
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = QATestRunner;
