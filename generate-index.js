import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES, TOPICS, CATEGORY_TAG, TOPIC_TAG, TITLE_PATTERNS, RELATED_INFORMATION,
} from './data/taxonomy.js';
import { runIndexer } from './data/indexer.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const argument = (name, fallback) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};

const TOTAL = Number(argument('total', 3000));
const SEED = Number(argument('seed', 42));
const HOST = 'https://main--kbankeds--xeragobiz.aem.live';
const START = Date.parse('2019-01-01T00:00:00Z');
const END = Date.parse('2026-10-15T00:00:00Z');

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seededRandom(SEED);
const pick = (list) => list[Math.floor(random() * list.length)];
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mediaName = (seed) => `media_1${crypto.createHash('sha1').update(seed).digest('hex')}`;

const shareTotal = CATEGORIES.reduce((sum, category) => sum + category.share, 0);
const counts = CATEGORIES.map((category) => Math.round((category.share / shareTotal) * TOTAL));
counts[0] += TOTAL - counts.reduce((sum, count) => sum + count, 0);

const pages = [];
const edgeCases = { 'missing-category-tag': 0, 'two-category-tags': 0, noindex: 0, 'no-topics': 0 };

pages.push({
  path: '/blogs',
  type: 'landing',
  meta: {
    'og:title': 'Kotak Stories: Money guides for every goal',
    description: 'Practical guides on loans, cards, accounts, deposits and insurance from Kotak.',
    template: 'blog-landing',
    robots: 'index, follow',
  },
  headers: { 'last-modified': new Date(END).toUTCString() },
});

CATEGORIES.forEach((category, categoryIndex) => {
  pages.push({
    path: `/blogs/${category.slug}`,
    type: 'category',
    category: category.slug,
    meta: {
      'og:title': `${category.name} guides`,
      description: `Guides, explainers and checklists about ${category.name.toLowerCase()} from Kotak.`,
      template: 'blog-category',
      'cq-tags': `${CATEGORY_TAG}${category.slug}`,
      'page-type': 'product',
      priority: String(category.priority),
      robots: 'index, follow',
    },
    headers: { 'last-modified': new Date(END).toUTCString() },
  });

  for (let i = 0; i < counts[categoryIndex]; i += 1) {
    const pattern = TITLE_PATTERNS[i % TITLE_PATTERNS.length];
    const edition = Math.floor(i / TITLE_PATTERNS.length) + 1;
    const title = `${pattern.replace('{name}', category.name)}${edition > 1 ? ` (Part ${edition})` : ''}`;
    const slug = slugify(title);
    const published = new Date(START + random() * (END - START));
    const modified = new Date(Math.min(END, published.getTime() + random() * 90 * 86400000));
    const topics = random() < 0.25
      ? []
      : [...new Set(Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(TOPICS)))];
    if (!topics.length) edgeCases['no-topics'] += 1;

    let productTags = [`${CATEGORY_TAG}${category.slug}`];
    let edgeCase = '';
    const roll = random();
    if (roll < 0.03) {
      productTags = [];
      edgeCase = 'missing-category-tag';
    } else if (roll < 0.04) {
      const other = pick(CATEGORIES.filter((item) => item.slug !== category.slug));
      productTags = [`${CATEGORY_TAG}${other.slug}`, `${CATEGORY_TAG}${category.slug}`];
      edgeCase = 'two-category-tags';
    }
    if (edgeCase) edgeCases[edgeCase] += 1;

    const noindex = random() < 0.02;
    if (noindex) edgeCases.noindex += 1;

    const media = mediaName(`${category.slug}/${slug}`);
    const description = `${title}: practical guidance on ${category.name.toLowerCase()} covering costs, eligibility, documents and smart next steps for Kotak customers.`.slice(0, 160);

    pages.push({
      path: `/blogs/${category.slug}/${slug}`,
      type: 'article',
      folder: category.slug,
      edgeCase,
      readingMinutes: 3 + Math.floor(random() * 8),
      meta: {
        'og:title': title,
        description,
        'og:image': `${HOST}/blogs/${category.slug}/${media}.jpg?width=1200&format=pjpg&optimize=medium`,
        'og:image:alt': title,
        'published-time': published.toISOString(),
        'modified-time': modified.toISOString(),
        'cq-tags': [...productTags, ...topics.map((topic) => `${TOPIC_TAG}${topic}`)].join(','),
        robots: noindex ? 'noindex, nofollow' : 'index, follow',
        template: 'blog-article',
      },
      headers: { 'last-modified': modified.toUTCString() },
    });
  }
});

const articlesInPublishOrder = pages
  .filter((page) => page.type === 'article')
  .sort((a, b) => a.meta['published-time'].localeCompare(b.meta['published-time']));
const indexOrder = [...pages.filter((page) => page.type !== 'article'), ...articlesInPublishOrder];

const indexes = runIndexer(indexOrder);

const write = (relativePath, content) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return Buffer.byteLength(content);
};

fs.rmSync(path.join(root, 'blogs'), { recursive: true, force: true });
fs.rmSync(path.join(root, 'assets'), { recursive: true, force: true });

write('content/pages.json', JSON.stringify(pages));

const report = [];
Object.entries(indexes).forEach(([target, sheet]) => {
  const bytes = write(target.slice(1), JSON.stringify(sheet));
  report.push({ target, rows: sheet.total, kb: Math.round(bytes / 1024) });
});

Object.entries(RELATED_INFORMATION).forEach(([slug, links]) => {
  const items = links.map((item) => `      <li data-icon="${item.icon}"><a href="${item.href}">${item.label}</a></li>`).join('\n');
  write(
    `assets/related-information/${slug}.plain.html`,
    `<div>\n  <div>\n    <h2>Related Information</h2>\n    <ul>\n${items}\n    </ul>\n  </div>\n</div>\n`,
  );
});

console.log(`Generated ${articlesInPublishOrder.length} articles (+ ${pages.length - articlesInPublishOrder.length} landing/category pages)`);
console.table(report);
console.log('Edge cases:', edgeCases);
