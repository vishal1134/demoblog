import json
from pathlib import Path

base = "https://main--kbankeds--xeragobiz.aem.live"
placeholder_img = (
    f"{base}/blogs/media_134b848c697e9152f269fa3b79696b855040912ba.png"
    "?width=1200&format=pjpg&optimize=medium"
)

categories = [
    {
        "name": "Credit Cards",
        "eyebrow": "Credit Cards",
        "slug": "credit-card-blog",
        "blogs": [
            ("Credit Card Basics: A Beginner’s Guide", "credit-card-basics-beginners-guide"),
            ("How to Choose the Right Credit Card", "choose-the-right-credit-card"),
            ("Understanding Credit Card Fees and Charges", "understanding-credit-card-fees"),
            ("Tips to Improve Your Credit Score", "tips-to-improve-credit-score"),
            ("How to Use Credit Cards Responsibly", "use-credit-cards-responsibly"),
        ],
    },
    {
        "name": "Deposits",
        "eyebrow": "Deposits",
        "slug": "deposit-blog",
        "blogs": [
            ("Fixed Deposits Explained: A Complete Guide", "fixed-deposits-complete-guide"),
            ("How Fixed Deposit Interest Is Calculated", "fixed-deposit-interest-calculation"),
            ("Cumulative vs Non-Cumulative Fixed Deposits", "cumulative-vs-non-cumulative-fixed-deposits"),
            ("How to Build Savings with Recurring Deposits", "build-savings-recurring-deposits"),
            ("Things to Check Before Opening a Fixed Deposit", "before-opening-a-fixed-deposit"),
        ],
    },
    {
        "name": "Personal Loans",
        "eyebrow": "Personal Loans",
        "slug": "personal-loan-blog",
        "blogs": [
            ("Personal Loans: Eligibility and Documents", "personal-loan-eligibility-documents"),
            ("How to Compare Personal Loan Interest Rates", "compare-personal-loan-interest-rates"),
            ("EMI Explained: Plan Your Monthly Repayments", "emi-monthly-repayments-guide"),
            ("When Should You Consider a Personal Loan?", "when-to-consider-personal-loan"),
            ("Common Personal Loan Application Mistakes", "personal-loan-application-mistakes"),
        ],
    },
    {
        "name": "Investments",
        "eyebrow": "Investments",
        "slug": "investment-blog",
        "blogs": [
            ("Investment Planning for Beginners", "investment-planning-for-beginners"),
            ("Risk and Return: What Every Investor Should Know", "investment-risk-and-return"),
            ("How to Set Financial Goals and Invest for Them", "financial-goals-and-investing"),
            ("Understanding Compounding and Long-Term Growth", "compounding-long-term-growth"),
            ("Diversification: Building a Balanced Portfolio", "diversification-balanced-portfolio"),
        ],
    },
    {
        "name": "Savings Accounts",
        "eyebrow": "Savings Accounts",
        "slug": "savings-account-blog",
        "blogs": [
            ("Savings Account Features You Should Know", "savings-account-features"),
            ("How to Choose a Savings Account", "choose-a-savings-account"),
            ("Simple Ways to Build an Emergency Fund", "build-an-emergency-fund"),
            ("Understanding Savings Account Interest", "savings-account-interest-explained"),
            ("Digital Banking Tips for Everyday Savings", "digital-banking-savings-tips"),
        ],
    },
]

entries = []
for category_index, category in enumerate(categories):
    for blog_index, (title, slug) in enumerate(category["blogs"]):
        day_offset = category_index * 5 + blog_index
        published_day = 1 + day_offset
        published_month = 9 if published_day <= 30 else 10
        published_day = published_day if published_day <= 30 else published_day - 30
        published = f"2026-{published_month:02d}-{published_day:02d}"

        modified_day = min(published_day + (blog_index % 3), 31)
        modified_month = published_month
        if modified_month == 9 and modified_day > 30:
            modified_month, modified_day = 10, modified_day - 30
        last_modified = f"2026-{modified_month:02d}-{modified_day:02d}"

        entries.append({
            "path": f"/blogs/{category['slug']}/{slug}",
            "img": placeholder_img,
            "title": title,
            "eyebrow": category["eyebrow"],
            "published": published,
            "lastModified": last_modified,
            # `tags` is the source of truth for product/category relationships.
            # The URL path is used only to navigate to an article.
            "tags": [category["slug"]],
        })

output_path = Path(__file__).parent / "query-index.json"
output_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(f"Created {output_path} with {len(entries)} blog entries.")
print("Category counts:")
for category in categories:
    print(f"- {category['name']}: {len(category['blogs'])}")
