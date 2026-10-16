export function getMetadata(name, doc = document) {
  const attr = name.includes(':') ? 'property' : 'name';
  return [...doc.head.querySelectorAll(`meta[${attr}="${name}"]`)].map((meta) => meta.content).join(', ');
}

export function toClassName(name) {
  return typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}

export function loadCSS(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`head > link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve;
    document.head.append(link);
  });
}

export function buildBlock(name, rows) {
  const block = document.createElement('div');
  block.classList.add(name);
  const table = Array.isArray(rows) ? rows : [[rows]];
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((cell) => {
      const cellEl = document.createElement('div');
      if (cell instanceof Node) cellEl.append(cell);
      else cellEl.textContent = cell ?? '';
      rowEl.append(cellEl);
    });
    block.append(rowEl);
  });
  return block;
}

export function readBlockRows(block) {
  return [...block.children].map((row) => [...row.children].map((cell) => cell.textContent.trim()));
}

function applySectionMetadata(section) {
  const meta = section.querySelector(':scope > .section-metadata');
  if (!meta) return;
  [...meta.children].forEach((row) => {
    const [key, value] = [...row.children].map((cell) => cell.textContent.trim());
    if (toClassName(key) === 'style') {
      value.split(',').map(toClassName).filter(Boolean).forEach((style) => section.classList.add(style));
    }
  });
  meta.remove();
}

export function decorateSections(main) {
  main.querySelectorAll(':scope > div:not([data-section-status])').forEach((section) => {
    applySectionMetadata(section);
    const wrappers = [];
    let current = null;
    [...section.children].forEach((child) => {
      const isBlock = child.tagName === 'DIV' && child.classList.length > 0;
      if (isBlock || !current) {
        current = document.createElement('div');
        current.className = isBlock ? `${child.classList[0]}-wrapper` : 'default-content-wrapper';
        wrappers.push(current);
      }
      current.append(child);
      if (isBlock) current = null;
    });
    section.append(...wrappers);
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
  });
}

export function decorateBlocks(main) {
  main.querySelectorAll('.section > div:not(.default-content-wrapper) > div:not([data-block-status])').forEach((block) => {
    block.classList.add('block');
    block.dataset.blockName = block.classList[0];
    block.dataset.blockStatus = 'initialized';
  });
}

export async function loadBlock(block) {
  if (block.dataset.blockStatus !== 'initialized') return;
  block.dataset.blockStatus = 'loading';
  const name = block.dataset.blockName;
  try {
    const [module] = await Promise.all([
      import(`/blocks/${name}/${name}.js`),
      loadCSS(`/blocks/${name}/${name}.css`),
    ]);
    await module.default(block);
  } catch (error) {
    console.error(`failed to load block ${name}`, error);
  }
  block.dataset.blockStatus = 'loaded';
}

export async function loadSection(section) {
  if (section.dataset.sectionStatus === 'loaded') return;
  section.dataset.sectionStatus = 'loading';
  await Promise.all([...section.querySelectorAll('div.block')].map(loadBlock));
  section.dataset.sectionStatus = 'loaded';
}

export function createElement(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'className') element.className = value;
    else element.setAttribute(key, value === true ? '' : value);
  });
  children.flat().filter((child) => child !== null && child !== undefined && child !== false).forEach((child) => {
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return element;
}
