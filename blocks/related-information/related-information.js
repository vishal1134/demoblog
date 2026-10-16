import { createElement, readBlockRows } from '../../scripts/aem-lite.js';
import { currentCategory } from '../../scripts/blog-index.js';
import { removeBlock, sidebarCard } from '../../scripts/blog-cards.js';

const BASE = '/assets/related-information';

async function fetchFragment(name) {
  if (!name) return null;
  const resp = await fetch(`${BASE}/${name}.plain.html`);
  if (!resp.ok) return null;
  return new DOMParser().parseFromString(await resp.text(), 'text/html');
}

export default async function decorate(block) {
  const limit = Number(readBlockRows(block)[0]?.[0]) || 5;
  block.classList.add('is-loading');
  block.replaceChildren();

  const doc = (await fetchFragment(currentCategory())) || (await fetchFragment('general'));
  const links = doc ? [...doc.querySelectorAll('li a[href]')].slice(0, limit) : [];
  block.classList.remove('is-loading');
  if (!links.length) {
    removeBlock(block);
    return;
  }
  const title = doc.querySelector('h2')?.textContent.trim() || 'Related Information';
  const list = createElement('ul', { className: 'info-list' }, links.map((link) => createElement(
    'li',
    { 'data-icon': link.closest('li')?.dataset.icon },
    createElement('a', { className: 'info-link', href: link.getAttribute('href') }, link.textContent.trim()),
  )));
  block.replaceChildren(sidebarCard(title, list));
}
