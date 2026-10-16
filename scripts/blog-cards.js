import { createElement } from './aem-lite.js';
import { cardImage, categoryLabel, formatDate } from './blog-index.js';
import { rowCategory } from './blog-select.js';

export function sidebarCard(title, body, badge) {
  return createElement(
    'section',
    { className: 'sidebar-card' },
    createElement(
      'div',
      { className: 'sidebar-header' },
      badge ? createElement('div', { className: 'sidebar-badge-wrap' }, createElement('span', { className: 'sidebar-badge' }, badge)) : null,
      createElement('h2', { className: 'sidebar-title' }, title),
    ),
    body,
  );
}

export function relatedItem(row) {
  return createElement(
    'a',
    { className: 'related-item', href: row.path },
    createElement('div', { className: 'related-thumb' }, createElement('img', {
      src: cardImage(row, 200), alt: '', loading: 'lazy', width: 100, height: 80,
    })),
    createElement(
      'div',
      { className: 'related-details' },
      createElement('span', { className: 'related-title' }, row.title),
      createElement('span', { className: 'related-date' }, formatDate(row.publishedDate)),
    ),
  );
}

export function blogCard(row) {
  return createElement(
    'article',
    { className: 'blog-card' },
    createElement(
      'a',
      { className: 'card-link', href: row.path },
      createElement(
        'div',
        { className: 'card-media' },
        createElement('img', {
          src: cardImage(row, 750), alt: '', loading: 'lazy', width: 750, height: 394,
        }),
        createElement('span', { className: 'card-eyebrow-pill' }, categoryLabel(rowCategory(row))),
      ),
      createElement(
        'div',
        { className: 'card-content' },
        createElement('div', { className: 'card-meta-top' }, createElement('span', {}, formatDate(row.publishedDate))),
        createElement('h3', { className: 'card-title' }, row.title),
        row.description ? createElement('p', { className: 'card-snippet' }, row.description) : null,
      ),
    ),
  );
}

export function storyCard(row, featured) {
  return createElement(
    'a',
    { className: `latest-story-card ${featured ? 'latest-story-featured' : 'latest-story-compact'}`, href: row.path },
    createElement('img', {
      className: 'latest-story-image', src: cardImage(row, featured ? 750 : 400), alt: '', loading: 'lazy', width: 750, height: 394,
    }),
    createElement(
      'div',
      { className: 'latest-story-copy' },
      createElement('span', { className: 'latest-story-category' }, categoryLabel(rowCategory(row))),
      createElement('h3', {}, row.title),
      createElement('span', { className: 'latest-story-read-time' }, formatDate(row.publishedDate)),
    ),
  );
}

export function removeBlock(block) {
  const wrapper = block.parentElement;
  block.remove();
  if (wrapper && !wrapper.children.length) wrapper.remove();
}
