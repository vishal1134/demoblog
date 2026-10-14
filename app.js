/**
 * KBank Dynamic Blog Application
 * 
 * Fetches dynamic live data from `query-index.json`.
 * Features:
 * - Tag-driven product category grouping and count computation
 * - "All" and individual category filter tabs
 * - Live search filter
 * - Hash-based client router supporting deep linking
 * - Rich dummy article generator with custom takeaways and metadata
 * - Latest Stories sorted by published date
 * - Related Products category list and Related Articles sidebar, both driven by tags
 */

class BlogApp {
  constructor() {
    this.allBlogs = [];
    this.categoriesMap = new Map(); // slug -> { slug, name, eyebrow, blogs: [] }
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.currentArticle = null;

    // DOM Elements
    this.catalogView = document.getElementById('catalog-view');
    this.detailView = document.getElementById('detail-view');
    this.categoryPillsContainer = document.getElementById('category-pills');
    this.blogGrid = document.getElementById('blog-grid');
    this.latestStoriesGrid = document.getElementById('latest-stories-grid');
    this.catalogHeading = document.getElementById('catalog-heading');
    this.catalogDescription = document.getElementById('catalog-description');
    this.visibleCount = document.getElementById('visible-count');
    this.countAll = document.getElementById('count-all');
    this.emptyState = document.getElementById('empty-state');
    this.searchInput = document.getElementById('search-input');
    this.clearSearchBtn = document.getElementById('clear-search');
    this.btnResetFilters = document.getElementById('btn-reset-filters');
    this.btnBackToBlogs = document.getElementById('btn-back-to-blogs');
    this.crumbCategory = document.getElementById('crumb-category');
    this.crumbTitle = document.getElementById('crumb-title');
    this.articleContent = document.getElementById('article-content');
    this.relatedProductsList = document.getElementById('related-products-list');
    this.relatedBlogsList = document.getElementById('related-blogs-list');
    this.sidebarCategoryBadge = document.getElementById('sidebar-category-badge');
    this.footerCategories = document.getElementById('footer-categories');
  }

  async init() {
    this.bindEvents();
    await this.fetchQueryIndex();
    this.renderCategoryPills();
    this.renderFooterLinks();
    this.renderLatestStories();
    this.handleRoute();
  }

  /**
   * Fetch live data from query-index.json
   */
  async fetchQueryIndex() {
    try {
      const response = await fetch('./query-index.json', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: Failed to load query-index.json`);
      }
      const rawData = await response.json();
      
      // Support array directly or wrapped in { data: [...] } (AEM EDS standard)
      const rawList = Array.isArray(rawData) ? rawData : (rawData.data || []);
      
      this.processData(rawList);
    } catch (err) {
      console.error('Error fetching query-index.json:', err);
      this.blogGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">⚠️</div>
          <h3>Unable to load query index</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Retry Loading</button>
        </div>
      `;
    }
  }

  /**
   * Extract product category from tags and build index structures.
   * Folder paths remain navigation URLs; they are not used for grouping.
   */
  processData(rawList) {
    this.allBlogs = rawList.map((item, index) => {
      const cleanPath = item.path || '';
      const parts = cleanPath.split('/').filter(Boolean);
      const categorySlug = this.getProductCategory(item.tags);
      const pageSlug = parts[2] || `article-${index + 1}`;
      const categoryName = item.eyebrow || item.tags || this.formatSlugToTitle(categorySlug);
      
      return {
        ...item,
        categorySlug,
        pageSlug,
        categoryName,
        readingTime: `${3 + (index % 4)} min read`,
        estimatedWords: 800 + (index * 75),
      };
    });

    // Group blogs by category slug
    this.categoriesMap.clear();
    this.allBlogs.forEach((blog) => {
      if (!this.categoriesMap.has(blog.categorySlug)) {
        this.categoriesMap.set(blog.categorySlug, {
          slug: blog.categorySlug,
          name: blog.categoryName,
          eyebrow: blog.eyebrow || blog.categoryName,
          blogs: [],
        });
      }
      this.categoriesMap.get(blog.categorySlug).blogs.push(blog);
    });

    if (this.countAll) {
      this.countAll.textContent = this.allBlogs.length;
    }
  }

  /**
   * Render category pill buttons dynamically
   */
  renderCategoryPills() {
    // Keep 'All Topics' button, append category buttons
    const fragment = document.createDocumentFragment();

    this.categoriesMap.forEach((category) => {
      const btn = document.createElement('button');
      btn.className = `category-pill ${this.activeCategory === category.slug ? 'active' : ''}`;
      btn.setAttribute('data-category', category.slug);
      btn.setAttribute('role', 'tab');
      btn.setAttribute('id', `tab-${category.slug}`);
      btn.setAttribute('aria-selected', this.activeCategory === category.slug ? 'true' : 'false');

      btn.innerHTML = `
        <span class="pill-title">${category.name}</span>
        <span class="pill-count">${category.blogs.length}</span>
      `;

      btn.addEventListener('click', () => {
        this.navigateToCategory(category.slug);
      });

      fragment.appendChild(btn);
    });

    // Clear everything after "all" button and append
    const allBtn = document.getElementById('tab-all');
    this.categoryPillsContainer.innerHTML = '';
    if (allBtn) {
      this.categoryPillsContainer.appendChild(allBtn);
      allBtn.addEventListener('click', () => this.navigateToCategory('all'));
    }
    this.categoryPillsContainer.appendChild(fragment);
  }

  /**
   * Render category links in the footer
   */
  renderFooterLinks() {
    if (!this.footerCategories) return;
    this.footerCategories.innerHTML = '';
    
    // Add All
    const allLi = document.createElement('li');
    allLi.innerHTML = `<a href="#/category/all">All Topics (${this.allBlogs.length})</a>`;
    this.footerCategories.appendChild(allLi);

    this.categoriesMap.forEach((category) => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#/category/${category.slug}">${category.name} (${category.blogs.length})</a>`;
      this.footerCategories.appendChild(li);
    });
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    window.addEventListener('hashchange', () => this.handleRoute());

    // Search filter
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      if (this.clearSearchBtn) {
        this.clearSearchBtn.style.display = this.searchQuery ? 'flex' : 'none';
      }
      this.filterAndRenderBlogList();
    });

    this.clearSearchBtn?.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.clearSearchBtn.style.display = 'none';
      this.filterAndRenderBlogList();
    });

    this.btnResetFilters?.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
      this.navigateToCategory('all');
    });

    this.btnBackToBlogs?.addEventListener('click', () => {
      if (this.currentArticle && this.currentArticle.categorySlug) {
        window.location.hash = `#/category/${this.currentArticle.categorySlug}`;
      } else {
        window.location.hash = '#/';
      }
    });

    // Scroll header styling
    window.addEventListener('scroll', () => {
      const header = document.getElementById('site-header');
      if (window.scrollY > 20) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
    });
  }

  /**
   * Client-side router handling hash routes
   */
  handleRoute() {
    const rawHash = window.location.hash || '#/';
    const cleanHash = rawHash.replace(/^#/, '');

    // Blog detail route: e.g. #/blog/blogs/credit-card-blog/... or #/blogs/credit-card-blog/...
    if (cleanHash.startsWith('/blog/') || cleanHash.startsWith('/blogs/')) {
      let blogPath = cleanHash;
      if (blogPath.startsWith('/blog/')) {
        blogPath = blogPath.replace('/blog', '');
      }
      this.showBlogDetail(blogPath);
      return;
    }

    // Category route: #/category/:slug
    if (cleanHash.startsWith('/category/')) {
      const categorySlug = cleanHash.replace('/category/', '');
      this.activeCategory = categorySlug || 'all';
      this.showCatalogView();
      return;
    }

    // Default route: show catalog with all
    this.activeCategory = 'all';
    this.showCatalogView();
  }

  navigateToCategory(slug) {
    window.location.hash = `#/category/${slug}`;
  }

  navigateToBlog(path) {
    window.location.hash = `#/blog${path}`;
  }

  /**
   * Display catalog view with active filters
   */
  showCatalogView() {
    this.catalogView.style.display = 'block';
    this.detailView.style.display = 'none';
    this.currentArticle = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update active category pill
    const pills = this.categoryPillsContainer.querySelectorAll('.category-pill');
    pills.forEach((pill) => {
      const cat = pill.getAttribute('data-category');
      if (cat === this.activeCategory) {
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
      } else {
        pill.classList.remove('active');
        pill.setAttribute('aria-selected', 'false');
      }
    });

    // Update nav links
    document.querySelectorAll('.header-nav .nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (this.activeCategory === 'all' && (href === '#/' || href === '#/category/all')) {
        link.classList.add('active');
      } else if (href === `#/category/${this.activeCategory}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    this.filterAndRenderBlogList();
  }

  /**
   * Filter and render cards in catalog view
   */
  filterAndRenderBlogList() {
    let filtered = this.allBlogs;

    // Filter by category
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter((b) => b.categorySlug === this.activeCategory);
    }

    // Filter by search query
    if (this.searchQuery) {
      filtered = filtered.filter((b) => {
        return (
          b.title.toLowerCase().includes(this.searchQuery) ||
          b.categoryName.toLowerCase().includes(this.searchQuery) ||
          this.getTagsText(b.tags).includes(this.searchQuery)
        );
      });
    }

    // Update headings
    if (this.activeCategory === 'all') {
      this.catalogHeading.textContent = 'All Financial Guides';
      this.catalogDescription.textContent = `Showing articles across all ${this.categoriesMap.size} editorial categories.`;
    } else {
      const catInfo = this.categoriesMap.get(this.activeCategory);
      const catName = catInfo ? catInfo.name : this.formatSlugToTitle(this.activeCategory);
      this.catalogHeading.textContent = `${catName} Guides`;
      this.catalogDescription.textContent = `Expert advice, insights, and how-tos specifically on ${catName}.`;
    }

    this.visibleCount.textContent = filtered.length;

    if (filtered.length === 0) {
      this.blogGrid.style.display = 'none';
      this.emptyState.style.display = 'block';
      return;
    }

    this.blogGrid.style.display = 'grid';
    this.emptyState.style.display = 'none';

    this.blogGrid.innerHTML = filtered
      .map((item) => this.renderBlogCard(item))
      .join('');

    this.attachBlogNavigation(this.blogGrid);
  }

  /** Render the three most recently published entries from the generated index. */
  renderLatestStories() {
    if (!this.latestStoriesGrid) return;

    const latestStories = [...this.allBlogs]
      .sort((a, b) => this.getPublishedTimestamp(b.published) - this.getPublishedTimestamp(a.published))
      .slice(0, 3);

    this.latestStoriesGrid.innerHTML = latestStories.length
      ? latestStories.map((item) => this.renderBlogCard(item)).join('')
      : '<p class="latest-stories-empty">No stories are available yet.</p>';

    this.attachBlogNavigation(this.latestStoriesGrid);
  }

  /** Attach route navigation to article cards in any section. */
  attachBlogNavigation(container) {
    const cards = container.querySelectorAll('.blog-card');
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const path = card.getAttribute('data-path');
        if (path) {
          this.navigateToBlog(path);
        }
      });
    });
  }

  /**
   * Generate HTML for a single blog card
   */
  renderBlogCard(item) {
    const badgeClass = this.getBadgeClass(item.categorySlug);
    const formattedDate = this.formatDate(item.published);

    return `
      <article class="blog-card" data-path="${item.path}" tabindex="0" role="button" aria-label="Read ${item.title}">
        <div class="card-media">
          <img 
            src="${item.img}" 
            alt="${item.title}" 
            loading="lazy"
            onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22340%22 viewBox=%220 0 600 340%22><rect fill=%22%230284c7%22 width=%22600%22 height=%22340%22/><text fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-size=%2226%22 font-weight=%22bold%22 text-anchor=%22middle%22 x=%22300%22 y=%22175%22>${encodeURIComponent(item.categoryName)}</text></svg>';"
          >
          <span class="card-eyebrow-pill ${badgeClass}">${item.eyebrow || item.categoryName}</span>
        </div>
        <div class="card-content">
          <div class="card-meta-top">
            <span>${formattedDate}</span>
            <span class="meta-dot"></span>
            <span>${item.readingTime}</span>
          </div>
          <h3 class="card-title">${item.title}</h3>
          <p class="card-snippet">
            Discover essential principles, key regulations, and actionable strategies for mastering your finances in ${item.categoryName}.
          </p>
          <div class="card-footer">
            <span class="card-footer-cta">
              Read Guide
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </span>
            <span class="card-path-tag">${item.pageSlug}</span>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Display the detailed blog page view
   */
  showBlogDetail(blogPath) {
    // Find the blog item by exact path or matching slug
    let blog = this.allBlogs.find((b) => b.path === blogPath);
    if (!blog) {
      // Try relaxed matching
      blog = this.allBlogs.find((b) => blogPath.endsWith(b.pageSlug));
    }

    if (!blog) {
      console.warn(`Article not found for path: ${blogPath}`);
      this.catalogHeading.textContent = 'Article Not Found';
      this.showCatalogView();
      return;
    }

    this.currentArticle = blog;
    this.catalogView.style.display = 'none';
    this.detailView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update Breadcrumbs
    if (this.crumbCategory) {
      this.crumbCategory.textContent = blog.categoryName;
      this.crumbCategory.setAttribute('href', `#/category/${blog.categorySlug}`);
    }
    if (this.crumbTitle) {
      this.crumbTitle.textContent = blog.title;
      this.crumbTitle.setAttribute('title', blog.title);
    }
    if (this.sidebarCategoryBadge) {
      this.sidebarCategoryBadge.textContent = blog.categoryName;
    }

    // Render Dummy Article Body
    this.renderArticleContent(blog);

    // Render tag-driven product categories and matching related articles.
    this.renderRelatedProducts(blog);
    this.renderRelatedArticles(blog);
  }

  /**
   * Render dummy article body with rich editorial layout
   */
  renderArticleContent(blog) {
    const badgeClass = this.getBadgeClass(blog.categorySlug);
    const pubDate = this.formatDate(blog.published);
    const modDate = this.formatDate(blog.lastModified);

    this.articleContent.innerHTML = `
      <header class="article-header">
        <div class="article-eyebrow-row">
          <span class="article-badge ${badgeClass}">${blog.eyebrow || blog.categoryName}</span>
          <span class="article-read-time">📖 ${blog.readingTime}</span>
          <span class="article-read-time">· ${blog.estimatedWords} words</span>
        </div>
        <h1 class="article-title">${blog.title}</h1>
        <div class="article-meta-bar">
          <span>Published on <strong>${pubDate}</strong></span>
          <span class="meta-dot"></span>
          <span>Last modified <strong>${modDate}</strong></span>
          <span class="meta-dot"></span>
          <span>Editorial Team at KBank</span>
        </div>
      </header>

      <div class="article-featured-media">
        <img 
          src="${blog.img}" 
          alt="${blog.title}" 
          onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%22450%22 viewBox=%220 0 900 450%22><rect fill=%22%230284c7%22 width=%22900%22 height=%22450%22/><text fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-size=%2232%22 font-weight=%22bold%22 text-anchor=%22middle%22 x=%22450%22 y=%22230%22>${encodeURIComponent(blog.title)}</text></svg>';"
        >
      </div>

      <div class="article-body">
        <p class="article-lead">
          Understanding the fundamentals of <strong>${blog.title}</strong> is critical for achieving optimal financial health and unlocking greater personal wealth. In this comprehensive guide, we unpack the essential principles, key regulations, and practical decisions you need to know.
        </p>

        <!-- Key Takeaways Box -->
        <div class="takeaways-box">
          <div class="takeaways-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Key Editorial Takeaways
          </div>
          <ul class="takeaways-list">
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
              Always compare annual percentage rates, processing fees, and potential tenure penalties before committing.
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
              Automate monthly contributions or payments to prevent late fees and preserve a stellar credit standing.
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
              Leverage compound growth and balanced risk distribution across diversified portfolios.
            </li>
          </ul>
        </div>

        <h2>1. Why ${blog.title} Matters</h2>
        <p>
          Whether you are just getting started or refining an existing financial portfolio, having a disciplined approach to ${blog.categoryName.toLowerCase()} helps mitigate risks and maximizes long-term returns. Modern retail banking gives consumers unprecedented flexibility, but making informed decisions requires looking past standard promotional marketing.
        </p>

        <p>
          Evaluating the terms, transparency of disclosures, and compounding structures ensures you select options tailored to your personal liquidity needs and time horizons.
        </p>

        <!-- Pro Tip Box -->
        <div class="callout-box">
          <div class="callout-icon">💡</div>
          <div class="callout-content">
            <h4>KBank Editorial Pro Tip</h4>
            <p>
              Always review the schedule of charges and compound calculation frequencies every quarter. Even minor 0.25% variations can make a substantial difference over a multi-year horizon.
            </p>
          </div>
        </div>

        <h2>2. Strategic Step-by-Step Implementation</h2>
        <p>
          Follow these structured phases to optimize your engagement with this asset class:
        </p>
        <ul class="article-bullets">
          <li><strong>Audit Current Financial Metrics:</strong> Review net monthly cash flow, existing debt ratios, and emergency reserves.</li>
          <li><strong>Define Clear Time Horizons:</strong> Align each vehicle with a concrete milestone (e.g., 6-month liquidity, 3-year goals, or retirement planning).</li>
          <li><strong>Establish Automated Discipline:</strong> Set up automated standing orders right after paydays to systematically execute your plan.</li>
          <li><strong>Annual Portfolio Rebalancing:</strong> Review asset allocations and fee structures annually to ensure alignment with prevailing interest rates.</li>
        </ul>

        <h2>3. Common Mistakes to Avoid</h2>
        <p>
          Many consumers fail to account for hidden administrative fees, prematurely break compounding deposits without verifying penalties, or overleverage credit limits. Staying proactive and reading all terms guarantees sustained wealth generation.
        </p>

        <!-- Author Bio Box -->
        <div class="author-box">
          <div class="author-avatar">${blog.categoryName.charAt(0)}</div>
          <div class="author-meta">
            <h4>KBank Financial Research Desk</h4>
            <div class="author-role">Senior Wealth & Consumer Banking Analysts</div>
            <p class="author-bio">
              Authored by the quantitative advisory team at KBank. Dedicated to demystifying modern financial products with objective, data-backed editorial insights.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render product categories from the tag-derived category groups.
   * The current category remains visible and is marked as active.
   */
  renderRelatedProducts(currentBlog) {
    if (!this.relatedProductsList) return;

    this.relatedProductsList.innerHTML = [...this.categoriesMap.values()]
      .map((category) => {
        const isCurrent = category.slug === currentBlog.categorySlug;
        return `
          <button
            type="button"
            class="product-category-item ${isCurrent ? 'active' : ''}"
            data-category="${category.slug}"
            aria-label="Browse ${category.name} products"
            aria-current="${isCurrent ? 'true' : 'false'}"
          >
            <span class="product-category-name">${category.name}</span>
            <span class="product-category-count">${category.blogs.length} guides</span>
          </button>
        `;
      })
      .join('');

    this.relatedProductsList.querySelectorAll('.product-category-item').forEach((button) => {
      button.addEventListener('click', () => {
        const categorySlug = button.getAttribute('data-category');
        if (categorySlug) this.navigateToCategory(categorySlug);
      });
    });
  }

  /** Render articles matched to the active article's product-category tag. */
  renderRelatedArticles(currentBlog) {
    // categorySlug is derived from `tags`, never from the folder in `path`.
    const categoryGroup = this.categoriesMap.get(currentBlog.categorySlug);
    const relatedBlogs = categoryGroup
      ? categoryGroup.blogs.filter((b) => b.path !== currentBlog.path)
      : [];

    if (relatedBlogs.length === 0) {
      this.relatedBlogsList.innerHTML = `
        <p style="font-size: 0.875rem; color: var(--color-text-muted); padding: 12px 0;">
          No other articles found in this category.
        </p>
      `;
      return;
    }

    this.relatedBlogsList.innerHTML = relatedBlogs
      .map((item) => {
        const formattedDate = this.formatDate(item.published);
        return `
          <button 
            type="button" 
            class="related-item" 
            data-path="${item.path}" 
            aria-label="Read ${item.title}"
          >
            <div class="related-thumb">
              <img 
                src="${item.img}" 
                alt="${item.title}" 
                loading="lazy"
                onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2280%22 viewBox=%220 0 100 80%22><rect fill=%22%230284c7%22 width=%22100%22 height=%2280%22/><text fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-size=%2216%22 font-weight=%22bold%22 text-anchor=%22middle%22 x=%2250%22 y=%2245%22>Guide</text></svg>';"
              >
            </div>
            <div class="related-details">
              <h4 class="related-title">${item.title}</h4>
              <div class="related-date">
                <span>${formattedDate}</span>
                <span>·</span>
                <span>${item.readingTime}</span>
              </div>
            </div>
          </button>
        `;
      })
      .join('');

    // Attach click listeners to related cards
    const relatedItems = this.relatedBlogsList.querySelectorAll('.related-item');
    relatedItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path) {
          this.navigateToBlog(path);
        }
      });
    });
  }

  /* Utility Helpers */
  formatDate(dateString) {
    if (!dateString) return 'Recent';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  }

  formatSlugToTitle(slug) {
    return slug
      .replace(/-blog$/i, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /** Return the product category tag (for example, `credit-card-blog`). */
  getProductCategory(tags) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    return tagList.find((tag) => typeof tag === 'string' && tag.endsWith('-blog')) || 'general-blog';
  }

  /** Normalize string or array tags for search. */
  getTagsText(tags) {
    return (Array.isArray(tags) ? tags : [tags])
      .filter((tag) => typeof tag === 'string')
      .join(' ')
      .toLowerCase();
  }

  /** Date-only timestamps avoid locale/time-zone ordering differences. */
  getPublishedTimestamp(dateString) {
    const timestamp = Date.parse(`${dateString}T00:00:00Z`);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  getBadgeClass(categorySlug) {
    switch (categorySlug) {
      case 'credit-card-blog':
        return 'badge-credit-cards';
      case 'deposit-blog':
        return 'badge-deposits';
      case 'personal-loan-blog':
        return 'badge-personal-loans';
      case 'investment-blog':
        return 'badge-investments';
      case 'savings-account-blog':
        return 'badge-savings-accounts';
      default:
        return 'badge-savings-accounts';
    }
  }
}

// Instantiate application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new BlogApp();
  app.init();
});
