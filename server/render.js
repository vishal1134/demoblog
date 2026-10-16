import { TAKEAWAYS, SECTIONS, FAQS } from '../data/article-body.js';
import { CATEGORIES } from '../data/taxonomy.js';

const SITE = 'https://www.kotak.example';

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const categoryName = (slug) => CATEGORIES.find((item) => item.slug === slug)?.name || 'Blogs';

const imagePath = (page) => (page.meta['og:image'] || '').replace(/^https?:\/\/[^/]+/, '');

function metaTags(page) {
  return Object.entries(page.meta)
    .map(([key, value]) => {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      return `  <meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(value)}">`;
    })
    .join('\n');
}

function jsonLd(page) {
  const crumbs = [
    { name: 'Blogs', item: `${SITE}/blogs` },
    { name: categoryName(page.folder), item: `${SITE}/blogs/${page.folder}` },
    { name: page.meta['og:title'], item: `${SITE}${page.path}` },
  ];
  const posting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: page.meta['og:title'],
    description: page.meta.description,
    image: `${SITE}${imagePath(page)}`,
    datePublished: page.meta['published-time'],
    dateModified: page.meta['modified-time'],
    mainEntityOfPage: `${SITE}${page.path}`,
    publisher: { '@type': 'Organization', name: 'Kotak Mahindra Bank' },
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  };
  return [posting, breadcrumb, faq]
    .map((data) => `  <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
    .join('\n');
}

function shell({ page, head = '', main }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.meta['og:title'])}</title>
  <link rel="canonical" href="${SITE}${page.path}">
${metaTags(page)}
${head}
  <link rel="stylesheet" href="/styles.css">
  <script type="module" src="/scripts/scripts.js"></script>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/blogs" class="brand-logo" aria-label="Kotak Stories home">
        <div class="logo-text"><span class="logo-title">KBank</span><span class="logo-badge">Stories</span></div>
      </a>
      <nav class="header-nav" aria-label="Main navigation">
${CATEGORIES.slice(0, 5).map((category) => `        <a class="nav-link" href="/blogs/${category.slug}">${escapeHtml(category.name)}</a>`).join('\n')}
      </nav>
    </div>
  </header>
  <main>
${main}
  </main>
  <footer class="site-footer">
    <div class="container footer-bottom"><p>&copy; 2026 KBank demo. Content is generated test data.</p></div>
  </footer>
</body>
</html>
`;
}

function articleBody() {
  const sections = SECTIONS.map((section) => {
    const paragraphs = section.paragraphs.map((text) => `      <p>${escapeHtml(text)}</p>`).join('\n');
    const list = section.list ? `      <ul>\n${section.list.map((item) => `        <li>${escapeHtml(item)}</li>`).join('\n')}\n      </ul>` : '';
    const table = section.table
      ? `      <table>\n        <thead><tr>${section.table.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>\n        <tbody>\n${section.table.rows.map((row) => `          <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n')}\n        </tbody>\n      </table>`
      : '';
    return [`      <h2>${escapeHtml(section.heading)}</h2>`, paragraphs, list, table].filter(Boolean).join('\n');
  }).join('\n');
  const faqs = FAQS.map(([question, answer]) => `      <h3>${escapeHtml(question)}</h3>\n      <p>${escapeHtml(answer)}</p>`).join('\n');
  return `      <h2>Key Takeaways</h2>
      <ul>
${TAKEAWAYS.map((item) => `        <li>${escapeHtml(item)}</li>`).join('\n')}
      </ul>
${sections}
      <h2>FAQs</h2>
${faqs}`;
}

export function renderArticle(page) {
  const published = new Date(page.meta['published-time']).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const main = `    <div>
      <p><picture><img src="${escapeHtml(imagePath(page).replace('width=1200', 'width=900'))}" alt="${escapeHtml(page.meta['og:image:alt'])}" width="900" height="473" fetchpriority="high"></picture></p>
      <h1>${escapeHtml(page.meta['og:title'])}</h1>
      <p class="article-meta-line">Published ${escapeHtml(published)} · ${page.readingMinutes} min read</p>
      <p>${escapeHtml(page.meta.description)}</p>
${articleBody()}
    </div>`;
  return shell({ page, head: jsonLd(page), main });
}

export function renderCategory(page) {
  const name = categoryName(page.category);
  const main = `    <div>
      <h1>${escapeHtml(name)} guides</h1>
      <p>${escapeHtml(page.meta.description)}</p>
      <div class="articles-listing">
        <div><div>category</div></div>
        <div><div>12</div></div>
      </div>
    </div>`;
  return shell({ page, main });
}

export function renderLanding(page) {
  const main = `    <div>
      <h1>${escapeHtml(page.meta['og:title'])}</h1>
      <p>${escapeHtml(page.meta.description)}</p>
    </div>
    <div>
      <div class="related-products">
        <div><div>8</div></div>
      </div>
    </div>
    <div>
      <div class="articles-listing">
        <div><div>recent</div></div>
        <div><div>9</div></div>
      </div>
    </div>`;
  return shell({ page, main });
}

export function renderSitemap(rows) {
  const urls = rows
    .filter((row) => !/noindex/i.test(row.robots || ''))
    .map((row) => `  <url><loc>${SITE}${row.path}</loc><lastmod>${new Date(row.lastModified * 1000).toISOString().slice(0, 10)}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderPlaceholderImage(pathName) {
  const palette = ['#0b5cab', '#c8102e', '#0f766e', '#7c3aed', '#b45309', '#1d4ed8', '#be185d', '#15803d'];
  const slug = pathName.split('/')[2] || '';
  const index = Math.max(0, CATEGORIES.findIndex((item) => item.slug === slug));
  const label = escapeHtml(categoryName(slug));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${palette[index % palette.length]}"/><text x="60" y="560" fill="#ffffff" font-family="sans-serif" font-size="64" font-weight="700">${label}</text></svg>`;
}
