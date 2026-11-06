import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Run against a parent-folder server, or set PROXY_TEST_URL for another URL.
const base = process.env.PROXY_TEST_URL || 'http://127.0.0.1:3000/proxy/';
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
try {
  for (const width of [375, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 } });
    await ctx.route(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
      route => route.abort());
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?clean=1&v=44', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#tab-view iframe') &&
      document.body.classList.contains('sidebar-off'));
    const layout = await page.evaluate(() => {
      const f = document.querySelector('#tab-view iframe');
      const r = f.getBoundingClientRect();
      return {
        overlay: !!document.querySelector('#small-screen-overlay'),
        frameWidth: r.width, frameHeight: r.height,
        accessible: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === f
      };
    });
    assert.equal(layout.overlay, false);
    assert.ok(layout.frameWidth >= width * .95);
    assert.ok(layout.frameHeight >= 844 * .9);
    assert.equal(layout.accessible, true, 'the embedded page must receive touch/click events');
    assert.deepEqual(errors, []);
    await ctx.close();
    console.log(`PASS ${width}px: no blocking overlay, accessible full-width proxy frame, no JS errors`);
  }
} finally {
  await browser.close();
}
