import { createElement, readBlockRows } from '../../scripts/aem-lite.js';
import { categoryLabel, currentCategory, getRelatedIndex } from '../../scripts/blog-index.js';
import { relatedProducts } from '../../scripts/blog-select.js';
import { removeBlock, sidebarCard } from '../../scripts/blog-cards.js';

export default async function decorate(block) {
  const count = Number(readBlockRows(block)[0]?.[0]) || 4;
  const current = document.body.classList.contains('blog-article') ? currentCategory() : '';
  block.classList.add('is-loading');
  block.style.minHeight = `${120 + count * 58}px`;
  block.replaceChildren();

  const rows = relatedProducts(await getRelatedIndex(), current, count);
  block.classList.remove('is-loading');
  block.style.minHeight = '';
  if (!rows.length) {
    removeBlock(block);
    return;
  }
  const list = createElement('ul', { className: 'product-category-list' }, rows.map((row) => createElement(
    'li',
    {},
    createElement(
      'a',
      { className: 'product-category-item', href: row.path },
      createElement('span', { className: 'product-category-name' }, categoryLabel(row.category)),
    ),
  )));
  block.replaceChildren(sidebarCard('Related Products', list, current ? 'Explore more' : null));
}
