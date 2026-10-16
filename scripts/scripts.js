import {
  getMetadata, toClassName, decorateSections, decorateBlocks, loadSection, loadCSS,
} from './aem-lite.js';

const TEMPLATES = ['blog-article', 'blog-category', 'blog-landing'];
let templateModule;

async function loadTemplate() {
  const template = toClassName(getMetadata('template'));
  if (!TEMPLATES.includes(template)) return;
  document.body.classList.add(template);
  const [module] = await Promise.all([
    import(`/templates/${template}/${template}.js`),
    loadCSS(`/templates/${template}/${template}.css`),
  ]);
  templateModule = module;
}

export function decorateMain(main) {
  templateModule?.default?.(main);
  decorateSections(main);
  decorateBlocks(main);
}

async function loadEager() {
  await loadTemplate();
  const main = document.querySelector('main');
  if (!main) return;
  decorateMain(main);
  document.body.classList.add('appear');
  const first = main.querySelector('.section');
  if (first) await loadSection(first);
  performance.mark('eds:eager-done');
}

async function loadLazy() {
  const main = document.querySelector('main');
  const sections = [...main.querySelectorAll('.section:not([data-section-status="loaded"])')];
  await sections.reduce((chain, section) => chain.then(() => loadSection(section)), Promise.resolve());
  document.body.classList.add('footer-ready');
  performance.mark('eds:lazy-done');
}

loadEager().then(loadLazy);
