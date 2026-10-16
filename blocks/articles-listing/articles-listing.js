import { createElement, readBlockRows } from '../../scripts/aem-lite.js';
import {
  categoryLabel, currentRow, getAllRows, getCategoryRows, markShown,
} from '../../scripts/blog-index.js';
import {
  byNewest, folderOf, isIndexable, paginate, previousAndNext, recentArticles, relatedArticles,
} from '../../scripts/blog-select.js';
import {
  blogCard, relatedItem, removeBlock, sidebarCard,
} from '../../scripts/blog-cards.js';

const TYPES = ['related', 'recent', 'next-prev', 'category'];

function pageLink(page, label, current) {
  const params = new URLSearchParams(window.location.search);
  if (page === 1) params.delete('page');
  else params.set('page', page);
  const query = params.toString();
  return createElement('a', {
    className: `pagination-link${page === current ? ' active' : ''}`,
    href: `${window.location.pathname}${query ? `?${query}` : ''}`,
    'aria-current': page === current ? 'page' : null,
    'aria-label': label ? null : `Page ${page}`,
  }, label || String(page));
}

function pagination(page, pages) {
  if (pages < 2) return null;
  const numbers = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  const items = [];
  numbers.forEach((number, index) => {
    if (index && number - numbers[index - 1] > 1) items.push(createElement('span', { className: 'pagination-gap', 'aria-hidden': 'true' }, '…'));
    items.push(pageLink(number, null, page));
  });
  return createElement(
    'nav',
    { className: 'pagination', 'aria-label': 'Pagination' },
    page > 1 ? pageLink(page - 1, 'Previous', page) : null,
    items,
    page < pages ? pageLink(page + 1, 'Next', page) : null,
  );
}

async function renderRelated(block, count) {
  const [rows, current] = await Promise.all([getCategoryRows(), currentRow()]);
  const list = relatedArticles(rows, current, count);
  if (!list.length) return null;
  markShown(list);
  return sidebarCard('Related Articles', createElement('div', { className: 'related-list' }, list.map(relatedItem)));
}

async function renderNextPrev() {
  const [rows, current] = await Promise.all([getCategoryRows(), currentRow()]);
  const { previous, next } = previousAndNext(rows, current);
  if (!previous && !next) return null;
  const link = (row, label) => (row ? createElement(
    'a',
    { className: 'read-next-link', href: row.path },
    createElement('span', { className: 'read-next-label' }, label),
    createElement('span', { className: 'read-next-title' }, row.title),
    createElement('span', { className: 'read-next-arrow', 'aria-hidden': 'true' }, label.startsWith('Next') ? '→' : '←'),
  ) : null);
  return createElement(
    'nav',
    { className: 'article-pagination', 'aria-label': 'More articles in this category' },
    link(previous, 'Previous article'),
    link(next, 'Next article'),
  );
}

async function renderRecent(block, count) {
  const rows = await getAllRows();
  const list = recentArticles(rows, { count });
  if (!list.length) return null;
  return createElement(
    'section',
    { className: 'listing-section', 'aria-labelledby': 'recent-heading' },
    createElement('h2', { id: 'recent-heading' }, 'Latest stories'),
    createElement('div', { className: 'blog-grid' }, list.map(blogCard)),
  );
}

async function renderCategory(block, size) {
  const category = folderOf(window.location.pathname);
  const rows = (await getCategoryRows(category)).filter(isIndexable).sort(byNewest);
  const page = Number(new URLSearchParams(window.location.search).get('page')) || 1;
  const result = paginate(rows, page, size);
  if (!result.total) return null;
  const start = (result.page - 1) * size + 1;
  return createElement(
    'section',
    { className: 'listing-section', 'aria-labelledby': 'category-heading' },
    createElement('h2', { id: 'category-heading' }, `All ${categoryLabel(category)} articles`),
    createElement('p', { className: 'catalog-status' }, `Showing ${start}–${start + result.items.length - 1} of ${result.total}`),
    createElement('div', { className: 'blog-grid' }, result.items.map(blogCard)),
    pagination(result.page, result.pages),
  );
}

export default async function decorate(block) {
  const [[typeValue] = [], [countValue] = []] = readBlockRows(block);
  const type = TYPES.includes(typeValue) ? typeValue : 'related';
  const count = Number(countValue) || 4;
  block.dataset.type = type;
  block.classList.add('is-loading');
  block.replaceChildren();

  const renderers = {
    related: renderRelated, 'next-prev': renderNextPrev, recent: renderRecent, category: renderCategory,
  };
  const content = await renderers[type](block, count);
  block.classList.remove('is-loading');
  if (!content) {
    removeBlock(block);
    return;
  }
  block.replaceChildren(content);
  performance.mark(`block:articles-listing:${type}`);
}
