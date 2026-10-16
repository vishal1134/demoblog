import { createElement } from '../../scripts/aem-lite.js';
import { removeBlock, sidebarCard } from '../../scripts/blog-cards.js';

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function uniqueId(heading, used) {
  const base = heading.id || slugify(heading.textContent) || 'section';
  let id = base;
  let suffix = 2;
  while (used.has(id) || (document.getElementById(id) && document.getElementById(id) !== heading)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

export default function decorate(block) {
  const headings = [...document.querySelectorAll('main .article-main h2')];
  if (!headings.length) {
    removeBlock(block);
    return;
  }
  const used = new Set();
  const links = new Map();
  const items = headings.map((heading) => {
    heading.id = uniqueId(heading, used);
    const link = createElement('a', { className: 'toc-link', href: `#${heading.id}` }, heading.textContent.trim());
    links.set(heading.id, link);
    return createElement('li', {}, link);
  });
  const nav = createElement('nav', { 'aria-label': 'On this page' }, createElement('ul', { className: 'toc-list' }, items));
  block.replaceChildren(sidebarCard('On this page', nav));

  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
      links.forEach((link) => link.removeAttribute('aria-current'));
      links.get(entry.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-15% 0px -75% 0px' });
  headings.forEach((heading) => observer.observe(heading));
}
