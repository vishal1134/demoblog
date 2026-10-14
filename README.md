# KBank Financial Editorial Demo

A static demo site that renders financial editorial content from a generated query index.

## Features

- Loads article metadata at runtime from `query-index.json`.
- Uses category tags such as `credit-card-blog` for filters and relationships.
- Shows Latest Stories by sorting entries by `published` date.
- Shows Related Products as tag-derived product categories.
- Shows Related Articles by matching the active article's category tag.

## Run locally

```bash
node server.js
```

Then visit [http://localhost:3000](http://localhost:3000).

## Regenerate the query index

After updating the source entries in `generate-index.js`, run:

```bash
node generate-index.js
```

This rewrites `query-index.json`, which the browser fetches when the page loads.

## Project files

- `index.html` — page structure
- `styles.css` — responsive styles
- `app.js` — runtime data loading, routing, filtering, Latest Stories, and related content
- `generate-index.js` — JavaScript query-index generator
- `query-index.json` — generated article metadata
