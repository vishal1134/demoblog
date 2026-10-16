import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchAllRows } from '../scripts/blog-index.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const servers = [];

function startServer(port, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), ...env } });
    servers.push(child);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('running at')) resolve(`http://localhost:${port}`);
    });
    child.on('error', reject);
  });
}

let relaxed;
let strict;

before(async () => {
  [relaxed, strict] = await Promise.all([startServer(4391), startServer(4392, { STRICT_LIMIT: '1' })]);
});

after(() => servers.forEach((child) => child.kill()));

test('a category over 1,000 rows arrives complete when the server returns the whole file', async () => {
  const first = await (await fetch(`${relaxed}/blogs/home-loan/query-index.json`)).json();
  assert.equal(first.data.length, first.total);
  const rows = await fetchAllRows(`${relaxed}/blogs/home-loan/query-index.json`);
  assert.equal(rows.length, first.total);
  assert.ok(first.total > 1000);
});

test('the same category arrives complete when the server enforces the 1,000-row default', async () => {
  const first = await (await fetch(`${strict}/blogs/home-loan/query-index.json`)).json();
  assert.equal(first.data.length, 1000);
  const rows = await fetchAllRows(`${strict}/blogs/home-loan/query-index.json`);
  assert.equal(rows.length, first.total);
  assert.equal(new Set(rows.map((row) => row.path)).size, first.total);
});

test('the full blog index arrives complete through parallel chunks', async () => {
  const rows = await fetchAllRows(`${strict}/blogs/query-index.json`);
  assert.equal(rows.length, 3000);
  assert.equal(new Set(rows.map((row) => row.path)).size, 3000);
});

test('category indexes only contain their own folder and exclude the category landing page', async () => {
  const rows = await fetchAllRows(`${relaxed}/blogs/credit-cards/query-index.json`);
  assert.ok(rows.every((row) => row.path.startsWith('/blogs/credit-cards/')));
  assert.ok(!rows.some((row) => row.path === '/blogs/credit-cards'));
});

test('category index rows are lean: no description, path-only images', async () => {
  const sheet = await (await fetch(`${relaxed}/blogs/deposits/query-index.json?limit=1`)).json();
  assert.ok(!sheet.columns.includes('description'));
  assert.ok(sheet.data[0].image.startsWith('/blogs/deposits/media_'));
});

test('sitemap leaves out noindex pages', async () => {
  const [sitemap, rows] = await Promise.all([
    (await fetch(`${relaxed}/sitemap.xml`)).text(),
    fetchAllRows(`${relaxed}/blogs/query-index.json`),
  ]);
  const noindex = rows.filter((row) => /noindex/.test(row.robots));
  assert.ok(noindex.length > 0);
  noindex.forEach((row) => assert.ok(!sitemap.includes(`${row.path}<`)));
  assert.equal((sitemap.match(/<url>/g) || []).length, rows.length - noindex.length);
});

test('article pages carry the metadata the indexer and blocks rely on', async () => {
  const rows = await fetchAllRows(`${relaxed}/blogs/insurance/query-index.json`);
  const html = await (await fetch(`${relaxed}${rows[0].path}`)).text();
  ['cq-tags', 'published-time', 'template', 'robots', 'description'].forEach((name) => assert.match(html, new RegExp(`<meta name="${name}"`)));
  assert.match(html, /<link rel="canonical"/);
  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
});
