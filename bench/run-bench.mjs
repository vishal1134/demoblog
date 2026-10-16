import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:4300';
const RUNS = Number(process.env.RUNS || 3);
const SLOW_4G = {
  offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
};

const STEPS = [
  ['1 first visit: home-loan article', '/blogs/home-loan/how-to-choose-the-right-home-loan-for-your-needs'],
  ['2 next: another home-loan article', '/blogs/home-loan/home-loan-eligibility-what-you-need-to-know'],
  ['3 next: credit-cards article', '/blogs/credit-cards/how-to-choose-the-right-credit-cards-for-your-needs'],
  ['4 next: insurance article', '/blogs/insurance/how-to-choose-the-right-insurance-for-your-needs'],
];

const PERF_INIT = `
window.__perf = { lcp: 0, cls: 0, tbt: 0 };
new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__perf.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__perf.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__perf.tbt += Math.max(0, e.duration - 50); })).observe({ type: 'longtask', buffered: true });`;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

async function runMode(browser, mode, run) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(PERF_INIT);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', ({ requestId, request }) => requests.set(requestId, { url: request.url, bytes: 0, cached: false }));
  cdp.on('Network.requestServedFromCache', ({ requestId }) => {
    const entry = requests.get(requestId);
    if (entry) entry.cached = true;
  });
  cdp.on('Network.responseReceived', ({ requestId, response }) => {
    const entry = requests.get(requestId);
    if (entry && (response.fromDiskCache || response.fromMemoryCache)) entry.cached = true;
  });
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const entry = requests.get(requestId);
    if (entry) entry.bytes = entry.cached ? 0 : encodedDataLength;
  });

  const rows = [];
  for (const [step, pathName] of STEPS) {
    requests.clear();
    await page.goto(`${BASE}${pathName}${mode === 'full' ? '?mode=full' : ''}`);
    await page.waitForFunction(() => performance.getEntriesByName('eds:lazy-done').length > 0, null, { timeout: 60000 });
    const relatedMs = await page.evaluate(() => Math.round(performance.getEntriesByName('block:articles-listing:related')[0]?.startTime || 0));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => performance.getEntriesByName('block:bento-cards').length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    const metrics = await page.evaluate(() => {
      const measures = performance.getEntriesByType('measure').filter((entry) => entry.name.startsWith('index '));
      const storage = Object.keys(localStorage).reduce((sum, key) => sum + (localStorage.getItem(key) || '').length * 2, 0);
      return {
        lcpMs: Math.round(window.__perf.lcp),
        cls: Number(window.__perf.cls.toFixed(3)),
        tbtMs: Math.round(window.__perf.tbt),
        indexWaitMs: Math.round(Math.max(0, ...measures.map((entry) => entry.duration))),
        localStorageKB: Math.round(storage / 1024),
      };
    });
    const all = [...requests.values()];
    const index = all.filter((entry) => /query-index\.json|related-index\.json/.test(entry.url));
    rows.push({
      run,
      mode,
      step,
      indexKB: Math.round(index.reduce((sum, entry) => sum + entry.bytes, 0) / 1024),
      indexRequests: index.filter((entry) => !entry.cached).length,
      pageKB: Math.round(all.reduce((sum, entry) => sum + entry.bytes, 0) / 1024),
      relatedMs,
      ...metrics,
    });
  }
  await context.close();
  return rows;
}

const { chromium } = await import('playwright').catch(() => {
  console.error('Install Playwright first: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
});

const browser = await chromium.launch();
const raw = [];
for (let run = 1; run <= RUNS; run += 1) {
  for (const mode of ['category', 'full']) {
    raw.push(...await runMode(browser, mode, run));
  }
}
await browser.close();

const fields = ['indexKB', 'indexRequests', 'pageKB', 'relatedMs', 'indexWaitMs', 'lcpMs', 'cls', 'tbtMs', 'localStorageKB'];
const summary = [...new Set(raw.map((row) => `${row.mode}|${row.step}`))].map((key) => {
  const rows = raw.filter((row) => `${row.mode}|${row.step}` === key);
  return Object.fromEntries([
    ['mode', rows[0].mode],
    ['step', rows[0].step],
    ...fields.map((field) => [field, median(rows.map((row) => row[field]))]),
  ]);
});

console.table(summary);
fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify({ base: BASE, runs: RUNS, summary, raw }, null, 2));
console.log(`Saved bench/results.json (median of ${RUNS} runs, slow 4G + 4x CPU)`);
