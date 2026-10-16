import { getMetadata } from './aem-lite.js';
import { byNewest, resolveCategory, rowCategory } from './blog-select.js';

const CHUNK = 500;
const FULL_STORAGE_KEY = 'blogsQueryIndex';
const FULL_STORAGE_MS = 5 * 60 * 1000;
const requests = new Map();
const shown = new Set();

export const indexMode = () => (new URLSearchParams(window.location.search).get('mode') === 'full' ? 'full' : 'category');

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return resp.json();
}

export async function fetchAllRows(url, chunk = CHUNK) {
  const first = await fetchJson(url);
  const rows = first.data || [];
  const total = first.total || rows.length;
  if (rows.length >= total) return rows;
  const offsets = [];
  for (let offset = rows.length; offset < total; offset += chunk) offsets.push(offset);
  const pages = await Promise.all(offsets.map((offset) => fetchJson(`${url}?offset=${offset}&limit=${chunk}`)));
  return pages.reduce((all, page) => all.concat(page.data || []), rows);
}

function measured(name, promise) {
  performance.mark(`${name}:start`);
  return promise.finally(() => {
    performance.mark(`${name}:end`);
    performance.measure(name, `${name}:start`, `${name}:end`);
  });
}

export function getIndex(url) {
  if (!requests.has(url)) {
    requests.set(url, measured(`index ${url}`, fetchAllRows(url)).catch(() => []));
  }
  return requests.get(url);
}

async function fetchFullWithLocalStorage() {
  try {
    const cached = JSON.parse(localStorage.getItem(FULL_STORAGE_KEY));
    if (cached && Date.now() - cached.storedTime < FULL_STORAGE_MS) return cached.data;
  } catch (error) {
    localStorage.removeItem(FULL_STORAGE_KEY);
  }
  const json = await fetchJson('/blogs/query-index.json');
  const data = (json.data || []).sort(byNewest);
  try {
    localStorage.setItem(FULL_STORAGE_KEY, JSON.stringify({ storedTime: Date.now(), data }));
  } catch (error) {
    console.warn('index too large for localStorage', error);
  }
  return data;
}

function getFullRows() {
  const key = 'full-mode';
  if (!requests.has(key)) {
    requests.set(key, measured('index full-mode', fetchFullWithLocalStorage()).catch(() => []));
  }
  return requests.get(key);
}

export function currentCategory() {
  return resolveCategory({ tags: getMetadata('cq-tags'), path: window.location.pathname });
}

export function getCategoryRows(category = currentCategory()) {
  if (indexMode() === 'full') {
    return getFullRows().then((rows) => rows.filter((row) => rowCategory(row) === category));
  }
  return getIndex(`/blogs/${category}/query-index.json`);
}

export function getAllRows() {
  return indexMode() === 'full' ? getFullRows() : getIndex('/blogs/query-index.json');
}

export const getRelatedIndex = () => getIndex('/related-index.json');

export async function currentRow() {
  const rows = await getCategoryRows();
  const pathName = window.location.pathname;
  return rows.find((row) => row.path === pathName) || {
    path: pathName,
    tags: getMetadata('cq-tags'),
    category: currentCategory(),
    publishedDate: getMetadata('published-time'),
  };
}

export const markShown = (rows) => rows.forEach((row) => shown.add(row.path));

export const shownPaths = () => new Set(shown);

export const categoryLabel = (slug) => (slug || 'general')
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function cardImage(row, width = 750) {
  return (row.image || '').replace(/width=\d+/, `width=${width}`);
}
