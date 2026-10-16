# Benchmark: category indexes vs one full index (3,000 blogs)

Measured on 16 Oct 2026 with `bench/run-bench.mjs` logic: Chromium, slow 4G (150 ms latency, 1.6 Mbps), 4× CPU slowdown, desktop viewport, fresh browser profile per mode, median of 3 runs.

- **category** = our approach: each article loads only `/blogs/{category}/query-index.json` (lean columns), browser HTTP cache only.
- **full** = Shriram-style: each article loads the full `/blogs/query-index.json` (all columns) in one request and copies it into `localStorage`.

| Step | Mode | Index KB | Index requests | Page KB | Related articles visible | Index wait | LCP | CLS | TBT | localStorage |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 first visit, home-loan (1,100 blogs) | category | **49** | 2 | 78 | **1,865 ms** | **426 ms** | 1,080 ms | 0.006 | 2 ms | **0 KB** |
| 1 first visit, home-loan (1,100 blogs) | full | 162 | 2 | 191 | 2,548 ms | 1,147 ms | 1,076 ms | 0.006 | 0 ms | 3,755 KB |
| 2 another home-loan article | category | 0 | 0 | 9 | 1,352 ms | 30 ms | 1,016 ms | 0.006 | 0 ms | 0 KB |
| 2 another home-loan article | full | 0 | 0 | 9 | 1,351 ms | 49 ms | 1,032 ms | 0.006 | 0 ms | 3,755 KB |
| 3 credit-cards article (450) | category | 21 | 1 | 32 | 1,595 ms | 272 ms | 1,020 ms | 0.006 | 0 ms | 0 KB |
| 3 credit-cards article (450) | full | 0 | 0 | 11 | 1,353 ms | 55 ms | 1,024 ms | 0.006 | 0 ms | 3,755 KB |
| 4 insurance article (50) | category | 3 | 1 | 15 | 1,500 ms | 177 ms | 1,028 ms | 0.006 | 0 ms | 0 KB |
| 4 insurance article (50) | full | 0 | 0 | 11 | 1,351 ms | 8 ms | 1,024 ms | 0.006 | 0 ms | 3,755 KB |

Index requests count `related-index.json` (8 rows, < 1 KB) as one of the two first-visit requests.

## Reading the numbers

- **First visit (most blog traffic arrives from search, so this is the visit that matters most):** the category approach downloads **3.3× less index data** (49 KB vs 162 KB) and shows related articles **~0.7 s sooner** on slow 4G.
- **Same-category browsing:** both approaches are served from the browser cache, so they are equal.
- **Switching category:** the category approach pays a small download (3–21 KB). The full approach already paid for everything on the first visit.
- **LCP and CLS:** identical in both modes. The index never loads before the main content, so it cannot hurt LCP.
- **localStorage:** the full approach uses **3.75 MB of the ~5 MB browser limit at 3,000 blogs**. At about 4,000 blogs this copy fails, so the Shriram pattern stops caching at exactly the scale Kotak is planning for.
- **TBT:** no long tasks in either mode at 3,000 rows. Parsing is not the bottleneck; download size and storage are.

## Correctness finding

In full mode, a home-loan article that has two category tags (`kotak:product/insurance` first) appeared as "Previous article" on an insurance article. A single index filtered by tag lets mis-tagged pages leak into other categories. The per-category index is built from the **folder**, so the insurance index never contains a home-loan page. `npm run validate` lists the 138 pages with missing or duplicate category tags so authors can fix them.

## Caveats

- Generated titles repeat patterns, so this data compresses better than real content. On Shriram's real index, 3,000 rows are **310 KB** compressed (our synthetic full index: 162 KB). Both modes use the same data, so the ratio holds; real absolute sizes will be roughly 2× these figures.
- The server is local. It reproduces EDS index behaviour (paging, compression, `max-age=7200`), not real CDN latency. The 150 ms throttle stands in for it.
