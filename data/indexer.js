import { CATEGORIES } from './taxonomy.js';

const attribute = (name) => (meta) => meta[name] ?? '';

const match = (value, pattern) => {
  const found = (value || '').match(pattern);
  return found ? found[1] : '';
};

const parseTimestamp = (value) => {
  const time = Date.parse(value || '');
  return Number.isNaN(time) ? '' : Math.floor(time / 1000);
};

const FULL_PROPERTIES = {
  title: attribute('og:title'),
  description: attribute('description'),
  image: (meta) => match(meta['og:image'], /https?:\/\/[^/]+(\/.*)/),
  publishedDate: attribute('published-time'),
  category: (meta) => match(meta['cq-tags'], /kotak:product\/([^,]+)/),
  tags: attribute('cq-tags'),
  robots: attribute('robots'),
  lastModified: (meta, headers) => parseTimestamp(headers['last-modified']),
};

const LEAN_PROPERTIES = {
  title: FULL_PROPERTIES.title,
  image: FULL_PROPERTIES.image,
  publishedDate: FULL_PROPERTIES.publishedDate,
  category: FULL_PROPERTIES.category,
  tags: FULL_PROPERTIES.tags,
  robots: FULL_PROPERTIES.robots,
};

const RELATED_PROPERTIES = {
  title: attribute('og:title'),
  category: FULL_PROPERTIES.category,
  pageType: attribute('page-type'),
  priority: attribute('priority'),
};

export const INDICES = [
  {
    name: 'blogs',
    include: ['/blogs/**'],
    exclude: ['/blogs', '/blogs/*'],
    target: '/blogs/query-index.json',
    properties: FULL_PROPERTIES,
  },
  ...CATEGORIES.map((category) => ({
    name: `blogs-${category.slug}`,
    include: [`/blogs/${category.slug}/**`],
    exclude: [`/blogs/${category.slug}`],
    target: `/blogs/${category.slug}/query-index.json`,
    properties: LEAN_PROPERTIES,
  })),
  {
    name: 'related',
    include: ['/blogs/*'],
    exclude: [],
    target: '/related-index.json',
    properties: RELATED_PROPERTIES,
  },
];

export function matchesGlob(pathName, glob) {
  if (glob.endsWith('/**')) {
    const prefix = glob.slice(0, -3);
    return pathName === prefix || pathName.startsWith(`${prefix}/`);
  }
  if (glob.endsWith('/*')) {
    const prefix = glob.slice(0, -2);
    const rest = pathName.startsWith(`${prefix}/`) ? pathName.slice(prefix.length + 1) : null;
    return rest !== null && rest.length > 0 && !rest.includes('/');
  }
  return pathName === glob;
}

export function runIndexer(pages, indices = INDICES) {
  const output = {};
  indices.forEach((index) => {
    const columns = ['path', ...Object.keys(index.properties)];
    const data = pages
      .filter((page) => index.include.some((glob) => matchesGlob(page.path, glob)))
      .filter((page) => !index.exclude.some((glob) => matchesGlob(page.path, glob)))
      .map((page) => {
        const row = { path: page.path };
        Object.entries(index.properties).forEach(([column, extract]) => {
          row[column] = extract(page.meta, page.headers);
        });
        return row;
      });
    output[index.target] = { total: data.length, offset: 0, limit: data.length, columns, data, ':type': 'sheet' };
  });
  return output;
}
