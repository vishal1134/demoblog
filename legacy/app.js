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

const BLOG_REFERENCE_TEMPLATE = {
  eyebrow: 'Manage your budget',
  tags: ['Basics of Banking', 'Credit Cards', 'Startups'],
  takeaways: [
    'Build a weekend-trip budget from the costs that apply to your own plans.',
    'Check the current terms of any payment card or booking platform before relying on rewards.',
    'Compare fees, eligibility rules, exclusions, and repayment requirements before choosing a card.',
  ],
  introduction: [
    'A short getaway can include more than transport and accommodation. Meals, local travel, activities, and last-minute changes can all affect the final budget.',
    'The sections below offer a practical checklist for planning a trip and reviewing card terms. Costs and reward eligibility vary by itinerary, provider, and product; confirm details directly with the relevant provider before booking.',
  ],
  sections: [
    {
      heading: 'What Do Weekend Trips Actually Cost?',
      paragraphs: [
        'Start with the parts of the trip you expect to pay for, then leave room for items that are easy to overlook. Your total depends on the destination, travel dates, group size, booking choices, and personal preferences.',
      ],
      list: [
        'Transport to and from the destination, including local transfers.',
        'Accommodation, taxes, deposits, and any cancellation conditions.',
        'Meals, activities, entry tickets, and optional experiences.',
        'A contingency for changes or unexpected expenses.',
      ],
      table: {
        headers: ['Budget area', 'What to check'],
        rows: [
          ['Transport', 'Fare, baggage, transfer, and change conditions'],
          ['Accommodation', 'Total price, taxes, deposit, and cancellation terms'],
          ['Activities', 'Advance booking requirements and refund conditions'],
          ['Contingency', 'A personal amount based on your plans and comfort level'],
        ],
      },
    },
    {
      heading: 'How Do Travel Bookings Earn You Rewards?',
      paragraphs: [
        'Reward programmes use their own rules to define eligible purchases and how rewards are calculated or redeemed. A booking that appears travel-related may not qualify under every programme or channel.',
        'Before counting on a reward, read the current issuer and booking-platform terms. Check eligible merchants, booking channels, exclusions, caps, expiry dates, redemption options, and any fees. Do not treat an advertised reward as a discount until you have confirmed its conditions.',
      ],
      list: [
        'Confirm which transaction types and booking channels qualify.',
        'Check whether rewards are capped, conditional, or time-limited.',
        'Review redemption rules and any charges that may apply.',
      ],
    },
    {
      heading: 'What Should You Look for in a Card for Frequent Getaways?',
      paragraphs: [
        'Choose a card by comparing its current features with the way you actually travel. Consider the annual fee, payment due dates, applicable charges, acceptance where you plan to use it, and the terms attached to any travel-related benefits.',
        'A reward or benefit may not be valuable if it does not fit your plans or if carrying a balance creates costs. Compare the full terms, make sure repayments fit your budget, and contact the issuer if any condition is unclear.',
      ],
      list: [
        'Read the latest product terms and fee schedule.',
        'Check eligibility and exclusions for benefits you expect to use.',
        'Consider repayment obligations alongside any rewards.',
      ],
    },
    {
      heading: 'Conclusion',
      paragraphs: [
        'Plan the trip around a budget you can manage, verify booking and card terms before paying, and treat rewards as conditional rather than guaranteed. Product features and provider rules can change, so use the latest official information when making a decision.',
      ],
    },
    {
      heading: 'FAQs',
      faqs: [
        {
          question: 'What should I include in a weekend-trip budget?',
          answer: 'Consider transport, accommodation, meals, activities, local transfers, booking conditions, and a contingency that suits your plans.',
        },
        {
          question: 'Will every travel booking earn card rewards?',
          answer: 'Not necessarily. Eligibility depends on the card issuer’s current terms, the merchant, the booking channel, and any listed exclusions or limits.',
        },
        {
          question: 'Should I choose a card based only on its rewards?',
          answer: 'No. Compare the full terms, fees, repayment requirements, and benefits you are likely to use. Confirm product details with the issuer.',
        },
        {
          question: 'Where can I confirm a card’s current features?',
          answer: 'Check the issuer’s official product page and current terms, or contact the issuer directly before applying or booking.',
        },
      ],
    },
  ],
};

class BlogApp {
  constructor() {
    this.allBlogs = [];
    this.categoriesMap = new Map(); // slug -> { slug, name, eyebrow, blogs: [] }
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.currentArticle = null;
    this.defaultDocumentTitle = document.title;
    this.metaDescription = document.querySelector('meta[name="description"]');
    this.defaultMetaDescription = this.metaDescription?.content || '';

    // DOM Elements
    this.catalogView = document.getElementById('catalog-view');
    this.detailView = document.getElementById('detail-view');
    this.categoryPillsContainer = document.getElementById('category-pills');
    this.blogGrid = document.getElementById('blog-grid');
    this.latestStoriesGrid = document.getElementById('latest-stories-grid');
    this.latestStoriesSection = document.getElementById('latest-stories-section');
    this.landingLatestStoriesGrid = document.getElementById('landing-latest-stories-grid');
    this.landingLatestStoriesSection = document.getElementById('landing-latest-stories-section');
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
    this.articleToc = document.getElementById('article-toc');
    this.articleTocMobile = document.getElementById('article-toc-mobile');
    this.articleLatestStories = document.getElementById('article-latest-stories');
    this.latestTopicLinks = document.getElementById('latest-topic-links');
    this.landingLatestTopicLinks = document.getElementById('landing-latest-topic-links');
  }

  async init() {
    this.bindEvents();
    await this.fetchQueryIndex();
    this.renderCategoryPills();
    this.renderFooterLinks();
    this.renderLatestStories();
    this.renderLatestTopics();
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
      
      const blog = {
        ...item,
        categorySlug,
        pageSlug,
        categoryName,
      };

      const wordCount = Number(item.wordCount) > 0
        ? Number(item.wordCount)
        : this.getGeneratedArticleWordCount(blog);

      return {
        ...blog,
        wordCount,
        readingTime: this.formatReadingTime(wordCount),
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
    document.title = this.defaultDocumentTitle;
    if (this.metaDescription) this.metaDescription.content = this.defaultMetaDescription;
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
    this.renderLatestStories();
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
    const isLanding = this.activeCategory === 'all';
    if (this.landingLatestStoriesSection) this.landingLatestStoriesSection.style.display = isLanding ? 'block' : 'none';
    if (this.latestStoriesSection) this.latestStoriesSection.style.display = isLanding ? 'none' : 'block';

    const landingStories = [...this.allBlogs]
      .sort((a, b) => this.getPublishedTimestamp(b.published) - this.getPublishedTimestamp(a.published))
      .slice(0, 3);
    this.renderLatestStoryCards(this.landingLatestStoriesGrid, landingStories);

    const categoryStories = this.activeCategory === 'all'
      ? []
      : [...(this.categoriesMap.get(this.activeCategory)?.blogs || [])]
        .sort((a, b) => this.getPublishedTimestamp(b.published) - this.getPublishedTimestamp(a.published))
        .slice(0, 3);
    this.renderLatestStoryCards(this.latestStoriesGrid, categoryStories);
  }

  renderLatestStoryCards(container, stories) {
    if (!container) return;
    container.innerHTML = stories.length
      ? stories.map((item, index) => this.renderLatestStoryCard(item, index)).join('')
      : '<p class="latest-stories-empty">No stories are available yet.</p>';

    container.querySelectorAll('.latest-story-card').forEach((card) => {
      const navigate = () => {
        const path = card.getAttribute('data-path');
        if (path) this.navigateToBlog(path);
      };
      card.addEventListener('click', navigate);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate();
        }
      });
    });
  }

  renderLatestTopics() {
    const topicMarkup = [...this.categoriesMap.values()]
      .map((category) => `<a class="latest-topic-chip" href="#/category/${category.slug}">${this.escapeHtml(category.name)}</a>`)
      .join('');
    [this.latestTopicLinks, this.landingLatestTopicLinks].filter(Boolean)
      .forEach((container) => { container.innerHTML = topicMarkup; });
    document.querySelectorAll('.latest-see-more').forEach((button) => {
      button.addEventListener('click', () => {
      this.blogGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  renderLatestStoryCard(item, index) {
    const shape = index === 0 ? 'latest-story-featured' : 'latest-story-compact';
    return `
      <article class="latest-story-card ${shape}" data-path="${this.escapeHtml(item.path)}" tabindex="0" role="link" aria-label="Read ${this.escapeHtml(item.title)}">
        <img class="latest-story-image" src="${this.escapeHtml(item.img || '')}" alt="${this.escapeHtml(item.title)}" loading="lazy">
        <div class="latest-story-copy">
          <span class="latest-story-category">${this.escapeHtml(item.eyebrow || item.categoryName)}</span>
          <h3>${this.escapeHtml(item.title)}</h3>
          <span class="latest-story-read-time">${this.escapeHtml(item.readingTime)}</span>
        </div>
      </article>
    `;
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
    document.title = `${blog.title} | KBank Financial Editorial`;
    if (this.metaDescription) {
      this.metaDescription.content = `Read ${blog.title} and explore practical guidance for ${blog.categoryName.toLowerCase()}.`;
    }
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

    this.renderArticleContent(blog);
    this.renderTableOfContents();
    this.renderRelatedProducts(blog);
    this.renderRelatedArticles(blog);
    this.renderArticleLatestStories(blog);
  }

  /**
   * Render dummy article body with rich editorial layout
   */
  renderArticleContent(blog) {
    const pubDate = this.formatDate(blog.published);
    const modDate = this.formatDate(blog.lastModified);
    const categoryBlogs = this.categoriesMap.get(blog.categorySlug)?.blogs || [];
    const currentIndex = categoryBlogs.findIndex((item) => item.path === blog.path);
    const nextBlog = currentIndex >= 0 && categoryBlogs.length > 1
      ? categoryBlogs[(currentIndex + 1) % categoryBlogs.length]
      : null;
    const tags = BLOG_REFERENCE_TEMPLATE.tags
      .map((tag) => `<span class="article-tag">${this.escapeHtml(tag)}</span>`)
      .join('');

    this.articleContent.innerHTML = `
      <div class="article-featured-media">
        <img src="${this.escapeHtml(blog.img || '')}" alt="${this.escapeHtml(blog.title)}" onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%22450%22 viewBox=%220 0 900 450%22><rect fill=%22%230284c7%22 width=%22900%22 height=%22450%22/></svg>';">
      </div>
      <header class="article-header">
        <span class="article-eyebrow">${BLOG_REFERENCE_TEMPLATE.eyebrow}</span>
        <h1 class="article-title">${this.escapeHtml(blog.title)}</h1>
        <div class="article-meta-bar">
          <span>${pubDate}</span>
          <span class="meta-dot"></span>
          <span>${this.escapeHtml(blog.categoryName)}</span>
          <span class="meta-dot"></span>
          <span>${blog.readingTime}</span>
        </div>
        <div class="article-tags" aria-label="Article tags">${tags}</div>
      </header>
      <nav class="article-toc-mobile" aria-label="Table of Contents">
        <h2>Table of Contents</h2>
        <div id="article-toc-mobile"></div>
      </nav>
      <div class="article-body">
        <section class="takeaways-box" aria-labelledby="takeaways-title">
          <h2 class="takeaways-title" id="takeaways-title">Key Takeaways</h2>
          <ul class="takeaways-list">${BLOG_REFERENCE_TEMPLATE.takeaways.map((item) => `<li>${item}</li>`).join('')}</ul>
        </section>
        <section class="article-introduction">
          <h2>Introduction</h2>
          ${BLOG_REFERENCE_TEMPLATE.introduction.map((paragraph) => `<p>${paragraph}</p>`).join('')}
        </section>
        ${BLOG_REFERENCE_TEMPLATE.sections.map((section) => this.renderArticleSection(section)).join('')}
        <div class="author-box">
          <div class="author-avatar">${this.escapeHtml(blog.categoryName.charAt(0))}</div>
          <div class="author-meta">
            <h2>KBank Financial Research Desk</h2>
            <div class="author-role">Editorial Team</div>
            <p class="author-bio">This demo article is for general educational purposes. Confirm current product terms and travel booking conditions with the relevant providers.</p>
          </div>
        </div>
        ${nextBlog ? `
          <a class="read-next-link" href="#/blog${nextBlog.path}" aria-label="Read next article: ${this.escapeHtml(nextBlog.title)}">
            <span class="read-next-label">Read next</span>
            <span class="read-next-title">${this.escapeHtml(nextBlog.title)}</span>
            <span class="read-next-arrow" aria-hidden="true">&rarr;</span>
          </a>
        ` : ''}
      </div>
    `;
  }

  renderArticleSection(section) {
    const content = [];
    (section.paragraphs || []).forEach((paragraph) => content.push(`<p>${paragraph}</p>`));
    if (section.list?.length) {
      content.push(`<ul class="article-bullets">${section.list.map((item) => `<li>${item}</li>`).join('')}</ul>`);
    }
    if (section.table) {
      content.push(`
        <div class="article-table-wrap" role="region" aria-label="${this.escapeHtml(section.heading)} budget checklist" tabindex="0">
          <table class="article-table">
            <thead><tr>${section.table.headers.map((cell) => `<th scope="col">${cell}</th>`).join('')}</tr></thead>
            <tbody>${section.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      `);
    }
    if (section.faqs?.length) {
      content.push(`<div class="faq-list">${section.faqs.map((faq) => `
        <details class="faq-item">
          <summary>${faq.question}</summary>
          <p>${faq.answer}</p>
        </details>
      `).join('')}</div>`);
    }
    return `<section class="article-content-section"><h2>${this.escapeHtml(section.heading)}</h2>${content.join('')}</section>`;
  }

  renderTableOfContents() {
    if (!this.articleContent) return;
    this.articleTocMobile = this.articleContent.querySelector('#article-toc-mobile');
    const headings = this.articleContent.querySelectorAll('.article-content-section > h2');
    const links = [...headings].map((heading, index) => {
      const slug = heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      heading.id = `article-${this.currentArticle.pageSlug}-${index + 1}-${slug}`;
      heading.tabIndex = -1;
      return `<li><a class="toc-link" href="#${heading.id}">${this.escapeHtml(heading.textContent)}</a></li>`;
    });
    const tocMarkup = links.length
      ? `<ol class="toc-list">${links.join('')}</ol>`
      : '<p class="sidebar-empty">No sections available.</p>';
    [this.articleToc, this.articleTocMobile].filter(Boolean).forEach((container) => {
      container.innerHTML = tocMarkup;
      container.querySelectorAll('.toc-link').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const heading = document.getElementById(link.hash.slice(1));
          if (heading) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            heading.focus({ preventScroll: true });
          }
        });
      });
    });
  }

  renderArticleLatestStories(currentBlog) {
    if (!this.articleLatestStories) return;
    const stories = [...this.allBlogs]
      .filter((blog) => blog.path !== currentBlog.path)
      .sort((a, b) => this.getPublishedTimestamp(b.published) - this.getPublishedTimestamp(a.published))
      .slice(0, 3);
    this.articleLatestStories.innerHTML = stories.map((blog) => `
      <a class="sidebar-story" href="#/blog${blog.path}">
        <span class="sidebar-story-title">${this.escapeHtml(blog.title)}</span>
        <span class="sidebar-story-meta">${this.formatDate(blog.published)} · ${blog.readingTime}</span>
      </a>
    `).join('');
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
  getGeneratedArticleWordCount(blog) {
    const content = [
      blog.title,
      BLOG_REFERENCE_TEMPLATE.introduction,
      BLOG_REFERENCE_TEMPLATE.takeaways,
      BLOG_REFERENCE_TEMPLATE.sections.map((section) => [
        section.heading,
        section.paragraphs || [],
        section.list || [],
        section.table ? [section.table.headers, section.table.rows] : [],
        section.faqs ? section.faqs.flatMap((faq) => [faq.question, faq.answer]) : [],
      ]),
    ].flat(Infinity).join(' ');
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]);
  }

  formatReadingTime(wordCount) {
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return `${minutes} min read`;
  }

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
