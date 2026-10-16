# KBank Blog Scale Demo (EDS logic, 3,000 blogs)

This demo runs the blog logic planned for the Kotak EDS project against **3,000 generated blogs** and compares it with the single-index approach used by shriramfinance.in.

- **Category indexes:** one small query index per category folder, plus a full index used only by the landing page.
- **Tags:** AEM-style `cq-tags` (`kotak:product/...` for the category, `kotak:topic/...` for topics).
- **Right column:** headings overview, Related Products (the other categories), Related Information (content-fragment stand-in, top 5 links) and Related Articles (ranked by shared topic tags).
- **Below the article:** previous and next article in the same category, plus Latest Stories cards.

The block code follows the EDS `decorate(block)` pattern so it can move into the kbankeds repo with minimal changes.

## Run it

Requires Node 20 or later. No dependencies are needed to run the demo.

```bash
npm run generate
npm start
```

Open http://localhost:4300/blogs.

| Page | URL |
|---|---|
| Blog landing | `/blogs` |
| Category page with pagination | `/blogs/home-loan?page=2` |
| Article, our approach | `/blogs/credit-cards/how-to-choose-the-right-credit-cards-for-your-needs` |
| Same article, Shriram-style full index | add `?mode=full` |
| Sitemap (noindex pages left out) | `/sitemap.xml` |

Generate a different size with `node generate-index.js --total=5000`, then restart the server.

### Server options

| Variable | Effect |
|---|---|
| `PORT=4300` | Port to listen on |
| `STRICT_LIMIT=1` | Always apply the documented 1,000-row default, even without `offset`/`limit` |
| `LATENCY_MS=40` | Add a fixed delay to every response |

## Test and benchmark

```bash
npm test
npm run validate
npm i -D playwright && npx playwright install chromium
node bench/run-bench.mjs
```

- `npm test` runs 18 correctness tests: selection logic, fallbacks, ranking, the 5-link cap, fetching more than 1,000 rows, sitemap and metadata.
- `npm run validate` lists blogs with a missing or duplicate category tag. It exits with code 1 while any remain.
- `bench/run-bench.mjs` compares both modes on slow 4G with 4× CPU slowdown. The latest results are in [bench/RESULTS.md](bench/RESULTS.md).

## How it maps to EDS

| Demo file | In the kbankeds EDS project |
|---|---|
| `query.yaml` | Index configuration in the Configuration Service (`content/query.yaml`) |
| `data/indexer.js` | What EDS does on publish (reads `<meta>` tags into index rows) |
| `server.js` | EDS delivery: index paging (whole file without params, 1,000-row default with params), brotli, `max-age=7200` |
| `scripts/aem-lite.js` | Small subset of `scripts/aem.js` (sections, blocks, metadata) |
| `scripts/scripts.js` | `scripts/scripts.js`: eager and lazy phases; the template inserts the blocks |
| `templates/blog-article/` | Blog template: layout, breadcrumb, inserts the sidebar and bottom sections |
| `scripts/blog-index.js` | Shared index loader: one request per index per page, chunked paging, category resolution |
| `scripts/blog-select.js` | Pure selection logic: related, recent, previous/next, related products, pagination, validation |
| `blocks/*` | EDS blocks: `blog-toc`, `related-products`, `related-information`, `articles-listing`, `bento-cards` |
| `assets/related-information/*.plain.html` | Content fragments published as pages (json2html overlay output) |

## Folder layout

```
data/           taxonomy, indexer rules, article body text
server/         HTML rendering for article, category and landing pages
scripts/        EDS-style loader, index module, selection logic, shared cards
templates/      blog-article, blog-category, blog-landing
blocks/         right-column and listing blocks
test/           node:test suites
bench/          benchmark runner and results
legacy/         the original single-page demo, kept for reference
```

Generated files (`content/`, `blogs/`, `assets/`, `related-index.json`) are rebuilt by `npm run generate`.
