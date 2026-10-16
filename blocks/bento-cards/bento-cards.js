import { createElement, readBlockRows } from '../../scripts/aem-lite.js';
import { getCategoryRows, shownPaths } from '../../scripts/blog-index.js';
import { recentArticles } from '../../scripts/blog-select.js';
import { removeBlock, storyCard } from '../../scripts/blog-cards.js';

async function render(block, count) {
  const rows = await getCategoryRows();
  const stories = recentArticles(rows, {
    currentPath: window.location.pathname, count, exclude: shownPaths(),
  });
  block.classList.remove('is-loading');
  if (!stories.length) {
    removeBlock(block);
    return;
  }
  block.replaceChildren(createElement(
    'section',
    { className: 'latest-stories-section', 'aria-labelledby': 'bento-heading' },
    createElement('div', { className: 'section-heading-row' }, createElement('h2', { id: 'bento-heading' }, 'Latest Stories')),
    createElement('div', { className: 'latest-stories-grid' }, stories.map((row, index) => storyCard(row, index === 0))),
  ));
  performance.mark('block:bento-cards');
}

export default function decorate(block) {
  const [, [countValue] = []] = readBlockRows(block);
  const count = Number(countValue) || 5;
  block.classList.add('is-loading');
  block.replaceChildren();
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      render(block, count);
    }
  }, { rootMargin: '300px 0px' });
  observer.observe(block);
}
