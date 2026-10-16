import { buildBlock, createElement, getMetadata } from '../../scripts/aem-lite.js';
import { categoryLabel, currentCategory } from '../../scripts/blog-index.js';

function sectionWith(style, blocks) {
  const section = document.createElement('div');
  section.append(...blocks, buildBlock('section-metadata', [['style', style]]));
  return section;
}

function breadcrumb(main) {
  const category = currentCategory();
  return createElement(
    'nav',
    { className: 'breadcrumbs', 'aria-label': 'Breadcrumb' },
    createElement('a', { className: 'crumb-link', href: '/blogs' }, 'Blogs'),
    createElement('span', { className: 'crumb-sep', 'aria-hidden': 'true' }, '/'),
    createElement('a', { className: 'crumb-link', href: `/blogs/${category}` }, categoryLabel(category)),
    createElement('span', { className: 'crumb-sep', 'aria-hidden': 'true' }, '/'),
    createElement('span', { className: 'crumb-current', 'aria-current': 'page' }, main.querySelector('h1')?.textContent || ''),
  );
}

export default function buildBlogLayout(main) {
  if (main.dataset.blogLayout) return;
  main.dataset.blogLayout = 'true';
  main.classList.add('container', 'article-layout');

  const article = main.querySelector(':scope > div');
  if (article) {
    article.classList.add('article-main');
    article.prepend(breadcrumb(main));
  }

  const authoredSidebar = [...main.querySelectorAll(':scope > div > .section-metadata')]
    .some((meta) => /blog-sidebar/i.test(meta.textContent));

  if (!authoredSidebar && getMetadata('hide-sidebar') !== 'true') {
    main.append(sectionWith('blog-sidebar, article-sidebar, sidebar-stack', [
      buildBlock('blog-toc', ''),
      buildBlock('related-products', [['4']]),
      buildBlock('related-information', [['5']]),
      buildBlock('articles-listing', [['related'], ['4']]),
    ]));
  }

  main.append(sectionWith('blog-more', [
    buildBlock('articles-listing', [['next-prev'], ['2']]),
    buildBlock('bento-cards', [['latest'], ['5']]),
  ]));
}
