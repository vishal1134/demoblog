import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tagsOf, topicsOf, resolveCategory, rowCategory, hasAnyTag, hasAllTags, relatedArticles,
  recentArticles, previousAndNext, relatedProducts, paginate, isIndexable, categoryTagIssues,
} from '../scripts/blog-select.js';

const row = (path, tags, publishedDate, extra = {}) => ({
  path, tags, publishedDate, category: (tags.match(/kotak:product\/([^,]+)/) || [])[1] || '', robots: 'index, follow', ...extra,
});

const current = row('/blogs/credit-cards/kotak-air', 'kotak:product/credit-cards,kotak:topic/travel,kotak:topic/rewards', '2026-05-01T00:00:00.000Z');
const rows = [
  current,
  row('/blogs/credit-cards/lounge', 'kotak:product/credit-cards,kotak:topic/travel', '2026-01-01T00:00:00.000Z'),
  row('/blogs/credit-cards/both', 'kotak:product/credit-cards,kotak:topic/travel,kotak:topic/rewards', '2025-01-01T00:00:00.000Z'),
  row('/blogs/credit-cards/limit', 'kotak:product/credit-cards', '2026-09-01T00:00:00.000Z'),
  row('/blogs/credit-cards/hidden', 'kotak:product/credit-cards,kotak:topic/travel', '2026-10-01T00:00:00.000Z', { robots: 'noindex, nofollow' }),
  row('/blogs/credit-cards/untagged', 'kotak:topic/travel', '2024-01-01T00:00:00.000Z'),
  row('/blogs/deposits/fd', 'kotak:product/deposits,kotak:topic/travel', '2026-10-02T00:00:00.000Z'),
];

test('tags are split from the AEM comma-separated cq-tags value', () => {
  assert.deepEqual(tagsOf(current), ['kotak:product/credit-cards', 'kotak:topic/travel', 'kotak:topic/rewards']);
  assert.deepEqual(topicsOf(current), ['kotak:topic/travel', 'kotak:topic/rewards']);
  assert.deepEqual(tagsOf({ tags: '' }), []);
});

test('category falls back from index column to tag to URL folder to general', () => {
  assert.equal(resolveCategory({ category: 'loans', tags: 'kotak:product/deposits', path: '/blogs/x/y' }), 'loans');
  assert.equal(resolveCategory({ tags: 'kotak:product/deposits,kotak:topic/emi', path: '/blogs/x/y' }), 'deposits');
  assert.equal(resolveCategory({ tags: 'kotak:topic/emi', path: '/blogs/credit-cards/y' }), 'credit-cards');
  assert.equal(resolveCategory({ tags: '', path: '/about' }), 'general');
  assert.equal(rowCategory(rows[5]), 'credit-cards');
});

test('any-of and all-of tag filters', () => {
  const any = rows.filter((item) => hasAnyTag(item, ['kotak:topic/rewards', 'kotak:product/deposits'])).map((item) => item.path);
  assert.deepEqual(any, ['/blogs/credit-cards/kotak-air', '/blogs/credit-cards/both', '/blogs/deposits/fd']);
  const all = rows.filter((item) => hasAllTags(item, ['kotak:topic/travel', 'kotak:topic/rewards'])).map((item) => item.path);
  assert.deepEqual(all, ['/blogs/credit-cards/kotak-air', '/blogs/credit-cards/both']);
});

test('related articles: same category, ranked by shared topics then newest, never current or noindex', () => {
  const related = relatedArticles(rows, current, 4).map((item) => item.path);
  assert.deepEqual(related, [
    '/blogs/credit-cards/both',
    '/blogs/credit-cards/lounge',
    '/blogs/credit-cards/untagged',
    '/blogs/credit-cards/limit',
  ]);
  assert.ok(!related.includes(current.path));
  assert.ok(!related.includes('/blogs/credit-cards/hidden'));
  assert.ok(!related.includes('/blogs/deposits/fd'));
});

test('related articles respects count and exclusions', () => {
  const exclude = new Set(['/blogs/credit-cards/both']);
  assert.deepEqual(relatedArticles(rows, current, 1, exclude).map((item) => item.path), ['/blogs/credit-cards/lounge']);
});

test('recent articles: newest first, excludes current, noindex and already shown', () => {
  const recent = recentArticles(rows, { currentPath: current.path, category: 'credit-cards', count: 3 }).map((item) => item.path);
  assert.deepEqual(recent, ['/blogs/credit-cards/limit', '/blogs/credit-cards/lounge', '/blogs/credit-cards/both']);
  const deduped = recentArticles(rows, {
    currentPath: current.path, category: 'credit-cards', count: 3, exclude: new Set(['/blogs/credit-cards/limit']),
  }).map((item) => item.path);
  assert.ok(!deduped.includes('/blogs/credit-cards/limit'));
});

test('previous and next stay inside the category and skip noindex', () => {
  const { previous, next } = previousAndNext(rows, current);
  assert.equal(previous.path, '/blogs/credit-cards/limit');
  assert.equal(next.path, '/blogs/credit-cards/lounge');
  const newest = previousAndNext(rows, rows[3]);
  assert.equal(newest.previous, null);
});

test('related products exclude the current category and sort by priority', () => {
  const products = [
    { path: '/blogs/deposits', category: 'deposits', pageType: 'product', priority: '7' },
    { path: '/blogs/credit-cards', category: 'credit-cards', pageType: 'product', priority: '3' },
    { path: '/blogs/home-loan', category: 'home-loan', pageType: 'product', priority: '1' },
    { path: '/blogs/insurance', category: 'insurance', pageType: 'product', priority: '8' },
    { path: '/about', category: '', pageType: 'info', priority: '1' },
  ];
  assert.deepEqual(relatedProducts(products, 'credit-cards', 2).map((item) => item.category), ['home-loan', 'deposits']);
  assert.ok(!relatedProducts(products, 'credit-cards', 10).some((item) => item.category === 'credit-cards'));
});

test('pagination clamps the page number', () => {
  const list = Array.from({ length: 25 }, (_, index) => index);
  assert.deepEqual(paginate(list, 3, 12), { items: [24], page: 3, pages: 3, total: 25 });
  assert.equal(paginate(list, 99, 12).page, 3);
  assert.equal(paginate(list, 0, 12).page, 1);
});

test('noindex detection', () => {
  assert.equal(isIndexable({ robots: 'noindex, nofollow' }), false);
  assert.equal(isIndexable({ robots: 'index, follow' }), true);
  assert.equal(isIndexable({}), true);
});

test('validation flags missing, duplicate and mismatched category tags', () => {
  const issues = categoryTagIssues([
    { path: '/blogs/deposits/a', tags: 'kotak:product/deposits' },
    { path: '/blogs/deposits/b', tags: 'kotak:topic/emi' },
    { path: '/blogs/deposits/c', tags: 'kotak:product/loans,kotak:product/deposits' },
    { path: '/blogs/deposits/d', tags: 'kotak:product/loans' },
  ]).map((item) => item.path);
  assert.deepEqual(issues, ['/blogs/deposits/b', '/blogs/deposits/c', '/blogs/deposits/d']);
});
