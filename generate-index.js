import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const base = "https://main--kbankeds--xeragobiz.aem.live";
const placeholderImg = `${base}/blogs/media_134b848c697e9152f269fa3b79696b855040912ba.png?width=1200&format=pjpg&optimize=medium`;

const categories = [
  {
    name: "Credit Cards",
    eyebrow: "Credit Cards",
    slug: "credit-card-blog",
    blogs: [
      ["Credit Card Basics: A Beginner’s Guide", "credit-card-basics-beginners-guide"],
      ["How to Choose the Right Credit Card", "choose-the-right-credit-card"],
      ["Understanding Credit Card Fees and Charges", "understanding-credit-card-fees"],
      ["Tips to Improve Your Credit Score", "tips-to-improve-credit-score"],
      ["How to Use Credit Cards Responsibly", "use-credit-cards-responsibly"],
    ],
  },
  {
    name: "Deposits",
    eyebrow: "Deposits",
    slug: "deposit-blog",
    blogs: [
      ["Fixed Deposits Explained: A Complete Guide", "fixed-deposits-complete-guide"],
      ["How Fixed Deposit Interest Is Calculated", "fixed-deposit-interest-calculation"],
      ["Cumulative vs Non-Cumulative Fixed Deposits", "cumulative-vs-non-cumulative-fixed-deposits"],
      ["How to Build Savings with Recurring Deposits", "build-savings-recurring-deposits"],
      ["Things to Check Before Opening a Fixed Deposit", "before-opening-a-fixed-deposit"],
    ],
  },
  {
    name: "Personal Loans",
    eyebrow: "Personal Loans",
    slug: "personal-loan-blog",
    blogs: [
      ["Personal Loans: Eligibility and Documents", "personal-loan-eligibility-documents"],
      ["How to Compare Personal Loan Interest Rates", "compare-personal-loan-interest-rates"],
      ["EMI Explained: Plan Your Monthly Repayments", "emi-monthly-repayments-guide"],
      ["When Should You Consider a Personal Loan?", "when-to-consider-personal-loan"],
      ["Common Personal Loan Application Mistakes", "personal-loan-application-mistakes"],
    ],
  },
  {
    name: "Investments",
    eyebrow: "Investments",
    slug: "investment-blog",
    blogs: [
      ["Investment Planning for Beginners", "investment-planning-for-beginners"],
      ["Risk and Return: What Every Investor Should Know", "investment-risk-and-return"],
      ["How to Set Financial Goals and Invest for Them", "financial-goals-and-investing"],
      ["Understanding Compounding and Long-Term Growth", "compounding-long-term-growth"],
      ["Diversification: Building a Balanced Portfolio", "diversification-balanced-portfolio"],
    ],
  },
  {
    name: "Savings Accounts",
    eyebrow: "Savings Accounts",
    slug: "savings-account-blog",
    blogs: [
      ["Savings Account Features You Should Know", "savings-account-features"],
      ["How to Choose a Savings Account", "choose-a-savings-account"],
      ["Simple Ways to Build an Emergency Fund", "build-an-emergency-fund"],
      ["Understanding Savings Account Interest", "savings-account-interest-explained"],
      ["Digital Banking Tips for Everyday Savings", "digital-banking-savings-tips"],
    ],
  },
];

const entries = [];
categories.forEach((category, categoryIndex) => {
  category.blogs.forEach(([title, slug], blogIndex) => {
    const dayOffset = categoryIndex * 5 + blogIndex;
    let publishedDay = 1 + dayOffset;
    let publishedMonth = publishedDay <= 30 ? 9 : 10;
    publishedDay = publishedDay <= 30 ? publishedDay : publishedDay - 30;
    const published = `2026-${String(publishedMonth).padStart(2, '0')}-${String(publishedDay).padStart(2, '0')}`;

    let modifiedDay = Math.min(publishedDay + (blogIndex % 3), 31);
    let modifiedMonth = publishedMonth;
    if (modifiedMonth === 9 && modifiedDay > 30) {
      modifiedMonth = 10;
      modifiedDay = modifiedDay - 30;
    }
    const lastModified = `2026-${String(modifiedMonth).padStart(2, '0')}-${String(modifiedDay).padStart(2, '0')}`;

    entries.push({
      path: `/blogs/${category.slug}/${slug}`,
      img: placeholderImg,
      title: title,
      eyebrow: category.eyebrow,
      published: published,
      lastModified: lastModified,
      // `tags` is the source of truth for product/category relationships.
      // The URL path is used only to navigate to an article.
      tags: [category.slug],
    });
  });
});

const outputPath = path.join(__dirname, 'query-index.json');
fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2) + '\n', 'utf-8');

console.log(`Generated ${entries.length} blog entries into ${outputPath}`);
categories.forEach((cat) => {
  console.log(`- ${cat.name}: ${cat.blogs.length}`);
});
