import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryTagIssues, isIndexable } from './scripts/blog-select.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const sheet = JSON.parse(fs.readFileSync(path.join(root, 'blogs/query-index.json'), 'utf8'));
const rows = sheet.data;
const issues = categoryTagIssues(rows);

const reasons = issues.reduce((summary, issue) => {
  let reason = 'category tag does not match folder';
  if (!issue.categoryTags.length) reason = 'missing category tag (URL fallback used)';
  else if (issue.categoryTags.length > 1) reason = 'more than one category tag (first one wins)';
  summary[reason] = (summary[reason] || 0) + 1;
  return summary;
}, {});

console.log(`Checked ${rows.length} blogs (${rows.filter((row) => !isIndexable(row)).length} noindex)`);
console.table(reasons);
console.log('First 10 pages to fix:');
issues.slice(0, 10).forEach((issue) => console.log(`  ${issue.path}  →  ${issue.categoryTags.join(' + ') || '(no category tag)'}`));
process.exitCode = issues.length ? 1 : 0;
