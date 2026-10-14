These are the main automatic-fetching functions in [app.js](D:/demoblog/app.js).

### 1. Fetch the generated query index

```javascript
async fetchQueryIndex() {
  const response = await fetch('./query-index.json', { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }

  const rawData = await response.json();
  const rawList = Array.isArray(rawData) ? rawData : (rawData.data || []);

  this.processData(rawList);
}
```

### 2. Read the category from `tags`, not the folder path

```javascript
processData(rawList) {
  this.allBlogs = rawList.map((item, index) => {
    const parts = (item.path || '').split('/').filter(Boolean);

    return {
      ...item,
      categorySlug: this.getProductCategory(item.tags),
      pageSlug: parts[2] || `article-${index + 1}`,
      categoryName: item.eyebrow,
    };
  });

  this.categoriesMap.clear();

  this.allBlogs.forEach((blog) => {
    if (!this.categoriesMap.has(blog.categorySlug)) {
      this.categoriesMap.set(blog.categorySlug, {
        slug: blog.categorySlug,
        name: blog.categoryName,
        blogs: [],
      });
    }

    this.categoriesMap.get(blog.categorySlug).blogs.push(blog);
  });
}
```

```javascript
getProductCategory(tags) {
  const tagList = Array.isArray(tags) ? tags : [tags];

  return tagList.find(
    (tag) => typeof tag === 'string' && tag.endsWith('-blog')
  ) || 'general-blog';
}
```

Example source data:

```json
{
  "eyebrow": "Credit Cards",
  "tags": ["credit-card-blog"]
}
```

### 3. Latest Stories — automatically sorted by publish date

```javascript
renderLatestStories() {
  const latestStories = [...this.allBlogs]
    .sort(
      (a, b) =>
        this.getPublishedTimestamp(b.published) -
        this.getPublishedTimestamp(a.published)
    )
    .slice(0, 3);

  this.latestStoriesGrid.innerHTML = latestStories
    .map((item) => this.renderBlogCard(item))
    .join('');

  this.attachBlogNavigation(this.latestStoriesGrid);
}
```

```javascript
getPublishedTimestamp(dateString) {
  const timestamp = Date.parse(`${dateString}T00:00:00Z`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
```

### 4. Related Products — automatically fetch distinct categories

```javascript
renderRelatedProducts(currentBlog) {
  this.relatedProductsList.innerHTML = [...this.categoriesMap.values()]
    .map((category) => {
      const isCurrent = category.slug === currentBlog.categorySlug;

      return `
        <button
          class="product-category-item ${isCurrent ? 'active' : ''}"
          data-category="${category.slug}"
        >
          <span>${category.name}</span>
          <span>${category.blogs.length} guides</span>
        </button>
      `;
    })
    .join('');

  this.relatedProductsList
    .querySelectorAll('.product-category-item')
    .forEach((button) => {
      button.addEventListener('click', () => {
        this.navigateToCategory(button.getAttribute('data-category'));
      });
    });
}
```

### 5. Related Articles — automatically fetch matching tag/category entries

```javascript
renderRelatedArticles(currentBlog) {
  const categoryGroup = this.categoriesMap.get(currentBlog.categorySlug);

  const relatedBlogs = categoryGroup
    ? categoryGroup.blogs.filter(
        (blog) => blog.path !== currentBlog.path
      )
    : [];

  this.relatedBlogsList.innerHTML = relatedBlogs
    .map((item) => {
      return `
        <button class="related-item" data-path="${item.path}">
          <h4>${item.title}</h4>
          <span>${this.formatDate(item.published)}</span>
        </button>
      `;
    })
    .join('');
}
```

### 6. Generator creates the tag-based category data

```javascript
entries.push({
  path: `/blogs/${category.slug}/${slug}`,
  title,
  eyebrow: category.eyebrow,
  published,
  lastModified,
  tags: [category.slug],
});
```

Run this whenever source entries change:

```text
node generate-index.js
```

The browser then automatically fetches the new `query-index.json` after refresh.
