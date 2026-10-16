import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  renderArticle, renderCategory, renderLanding, renderSitemap, renderPlaceholderImage,
} from './server/render.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4300);
const LATENCY_MS = Number(process.env.LATENCY_MS || 0);
const STRICT_LIMIT = process.env.STRICT_LIMIT === '1';
const DEFAULT_LIMIT = 1000;
const INDEX_CACHE = 'max-age=7200, must-revalidate';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
};

const pages = new Map(JSON.parse(fs.readFileSync(path.join(root, 'content/pages.json'), 'utf8')).map((page) => [page.path, page]));
const sheets = new Map();
const compressed = new Map();
const stats = { requests: 0, bytes: 0, byPath: {} };

function loadSheet(target) {
  if (!sheets.has(target)) {
    const file = path.join(root, target);
    sheets.set(target, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
  }
  return sheets.get(target);
}

function encode(key, body, encoding) {
  const cacheKey = `${key}|${encoding}`;
  if (!compressed.has(cacheKey)) {
    let output = Buffer.from(body);
    if (encoding === 'br') output = zlib.brotliCompressSync(output, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } });
    if (encoding === 'gzip') output = zlib.gzipSync(output, { level: 9 });
    compressed.set(cacheKey, output);
  }
  return compressed.get(cacheKey);
}

function send(req, res, {
  status = 200, type, body, cache = 'no-cache', key,
}) {
  const accepts = req.headers['accept-encoding'] || '';
  let encoding = 'identity';
  if (/\bbr\b/.test(accepts)) encoding = 'br';
  else if (/\bgzip\b/.test(accepts)) encoding = 'gzip';
  const payload = encode(key || `${req.url}|${status}`, body, encoding);
  const etag = `"${crypto.createHash('sha1').update(payload).digest('hex').slice(0, 16)}"`;
  const headers = {
    'Content-Type': type,
    'Cache-Control': cache,
    ETag: etag,
    Vary: 'Accept-Encoding',
  };
  if (encoding !== 'identity') headers['Content-Encoding'] = encoding;
  const finish = () => {
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    headers['Content-Length'] = payload.length;
    res.writeHead(status, headers);
    res.end(payload);
    if (!req.url.startsWith('/__stats')) {
      stats.requests += 1;
      stats.bytes += payload.length;
      const bucket = req.url.split('?')[0];
      stats.byPath[bucket] = (stats.byPath[bucket] || 0) + payload.length;
    }
  };
  if (LATENCY_MS) setTimeout(finish, LATENCY_MS);
  else finish();
}

function serveIndex(req, res, target, query) {
  const sheet = loadSheet(target);
  if (!sheet) {
    send(req, res, { status: 404, type: MIME['.json'], body: '{"error":"not found"}' });
    return;
  }
  const paged = query.has('offset') || query.has('limit') || STRICT_LIMIT;
  const offset = Math.max(0, Number(query.get('offset')) || 0);
  const limit = paged ? Math.max(0, Number(query.get('limit')) || DEFAULT_LIMIT) : sheet.total;
  const data = sheet.data.slice(offset, offset + limit);
  const body = JSON.stringify({
    total: sheet.total, offset, limit, columns: sheet.columns, data, ':type': 'sheet',
  });
  send(req, res, {
    type: MIME['.json'], body, cache: INDEX_CACHE, key: `${target}?${offset}:${limit}`,
  });
}

function serveStatic(req, res, pathName) {
  const file = path.normalize(path.join(root, pathName));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const ext = path.extname(file).toLowerCase();
  send(req, res, {
    type: MIME[ext] || 'application/octet-stream',
    body: fs.readFileSync(file),
    key: `static:${pathName}:${fs.statSync(file).mtimeMs}`,
  });
  return true;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathName = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';

  if (pathName === '/__stats') {
    const body = JSON.stringify(stats);
    if (url.searchParams.has('reset')) Object.assign(stats, { requests: 0, bytes: 0, byPath: {} });
    send(req, res, { type: MIME['.json'], body, key: `stats:${Date.now()}` });
    return;
  }
  if (pathName === '/') {
    res.writeHead(302, { Location: '/blogs' });
    res.end();
    return;
  }
  if (pathName.endsWith('query-index.json') || pathName === '/related-index.json') {
    serveIndex(req, res, pathName, url.searchParams);
    return;
  }
  if (pathName === '/sitemap.xml') {
    send(req, res, { type: MIME['.xml'], body: renderSitemap(loadSheet('/blogs/query-index.json').data), key: 'sitemap' });
    return;
  }
  if (/\/media_[0-9a-f]+\.(jpg|jpeg|png|webp)$/.test(pathName)) {
    send(req, res, {
      type: MIME['.svg'], body: renderPlaceholderImage(pathName), cache: 'max-age=86400', key: `img:${pathName.split('/')[2]}`,
    });
    return;
  }
  const page = pages.get(pathName);
  if (page) {
    const render = { article: renderArticle, category: renderCategory, landing: renderLanding }[page.type];
    send(req, res, { type: MIME['.html'], body: render(page), key: `page:${pathName}` });
    return;
  }
  if (serveStatic(req, res, pathName)) return;
  send(req, res, {
    status: 404, type: 'text/plain; charset=utf-8', body: '404 Not Found', key: '404',
  });
});

server.listen(PORT, () => {
  console.log(`KBank blog demo running at http://localhost:${PORT}/blogs`);
  console.log(`Index paging: ${STRICT_LIMIT ? 'always 1000-row default' : 'full file without params, 1000-row default with offset/limit'}`);
});
