export const CATEGORY_TAG = 'kotak:product/';
export const TOPIC_TAG = 'kotak:topic/';

export const tagsOf = (row) => (row?.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);

export const topicsOf = (row) => tagsOf(row).filter((tag) => tag.startsWith(TOPIC_TAG));

export const categoryTagsOf = (row) => tagsOf(row).filter((tag) => tag.startsWith(CATEGORY_TAG));

export const folderOf = (pathName) => {
  const parts = (pathName || '').split('/').filter(Boolean);
  return parts[0] === 'blogs' && parts.length >= 2 ? parts[1] : '';
};

export function resolveCategory({ category, tags, path }) {
  if (category) return category;
  const fromTags = categoryTagsOf({ tags })[0];
  if (fromTags) return fromTags.slice(CATEGORY_TAG.length);
  return folderOf(path) || 'general';
}

export const rowCategory = (row) => resolveCategory(row);

export const byNewest = (a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || '');

export const isIndexable = (row) => !/noindex/i.test(row?.robots || '');

export function hasAnyTag(row, wanted) {
  const tags = tagsOf(row);
  return wanted.some((tag) => tags.includes(tag));
}

export function hasAllTags(row, wanted) {
  const tags = tagsOf(row);
  return wanted.every((tag) => tags.includes(tag));
}

export function relatedArticles(rows, current, count = 4, exclude = new Set()) {
  const category = rowCategory(current);
  const myTopics = topicsOf(current);
  return rows
    .filter((row) => isIndexable(row) && row.path !== current.path && !exclude.has(row.path))
    .filter((row) => rowCategory(row) === category)
    .map((row) => ({ row, score: topicsOf(row).filter((tag) => myTopics.includes(tag)).length }))
    .sort((a, b) => b.score - a.score || byNewest(a.row, b.row))
    .slice(0, count)
    .map(({ row }) => row);
}

export function recentArticles(rows, { currentPath = '', category = '', count = 5, exclude = new Set() } = {}) {
  return rows
    .filter((row) => isIndexable(row) && row.path !== currentPath && !exclude.has(row.path))
    .filter((row) => !category || rowCategory(row) === category)
    .sort(byNewest)
    .slice(0, count);
}

export function previousAndNext(rows, current) {
  const category = rowCategory(current);
  const ordered = rows
    .filter((row) => isIndexable(row) && rowCategory(row) === category)
    .sort(byNewest);
  const position = ordered.findIndex((row) => row.path === current.path);
  if (position === -1) return { previous: null, next: null };
  return {
    previous: ordered[position - 1] || null,
    next: ordered[position + 1] || null,
  };
}

export function relatedProducts(rows, currentCategory, count = 4) {
  return rows
    .filter((row) => row.pageType === 'product' && row.category && row.category !== currentCategory)
    .sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99) || (a.title || '').localeCompare(b.title || ''))
    .slice(0, count);
}

export function paginate(rows, page, size) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return {
    items: rows.slice((current - 1) * size, current * size), page: current, pages, total: rows.length,
  };
}

export function categoryTagIssues(rows) {
  return rows
    .map((row) => ({ path: row.path, folder: folderOf(row.path), categoryTags: categoryTagsOf(row) }))
    .filter((row) => row.categoryTags.length !== 1 || row.categoryTags[0].slice(CATEGORY_TAG.length) !== row.folder);
}
