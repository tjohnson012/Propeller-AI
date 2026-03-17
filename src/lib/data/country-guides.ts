/**
 * Trade.gov Country Commercial Guides — on-demand fetcher + cache.
 * Fetches country guides from trade.gov when needed, caches in memory.
 * Each country has ~25-35 sections covering market conditions, regulations,
 * trade barriers, entry strategy, and business customs.
 *
 * Source: https://www.trade.gov/country-commercial-guides
 */

export interface CountryGuideSection {
  section: string;
  slug: string;
  content: string;
  url: string;
  lastUpdated?: string;
}

export interface CountryGuide {
  country: string;
  sections: CountryGuideSection[];
  fetchedAt: string;
}

// In-memory cache: country slug → guide data
const guideCache = new Map<string, { data: CountryGuide; ts: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Country name → URL slug mapping
const COUNTRY_SLUGS: Record<string, string> = {
  "albania": "albania", "argentina": "argentina", "armenia": "armenia",
  "australia": "australia", "austria": "austria", "azerbaijan": "azerbaijan",
  "bahamas": "bahamas", "bahrain": "bahrain", "bangladesh": "bangladesh",
  "barbados": "barbados", "belgium": "belgium", "belize": "belize",
  "bolivia": "bolivia", "bosnia": "bosnia-and-herzegovina",
  "botswana": "botswana", "brazil": "brazil", "brunei": "brunei",
  "bulgaria": "bulgaria", "burkina faso": "burkina-faso", "burma": "burma",
  "cambodia": "cambodia", "cameroon": "cameroon", "canada": "canada",
  "chad": "chad", "chile": "chile", "china": "china", "colombia": "colombia",
  "costa rica": "costa-rica", "cote d'ivoire": "cote-divoire",
  "croatia": "croatia", "cyprus": "cyprus", "czech republic": "czech-republic",
  "denmark": "denmark", "dominican republic": "dominican-republic",
  "ecuador": "ecuador", "egypt": "egypt", "el salvador": "el-salvador",
  "estonia": "estonia", "ethiopia": "ethiopia", "fiji": "fiji",
  "finland": "finland", "france": "france", "gabon": "gabon",
  "gambia": "gambia", "georgia": "georgia", "germany": "germany",
  "ghana": "ghana", "greece": "greece", "guatemala": "guatemala",
  "guinea": "guinea", "guyana": "guyana", "haiti": "haiti",
  "honduras": "honduras", "hong kong": "hong-kong", "hungary": "hungary",
  "iceland": "iceland", "india": "india", "indonesia": "indonesia",
  "iraq": "iraq", "ireland": "ireland", "israel": "israel", "italy": "italy",
  "jamaica": "jamaica", "japan": "japan", "jordan": "jordan",
  "kazakhstan": "kazakhstan", "kenya": "kenya", "kosovo": "kosovo",
  "kuwait": "kuwait", "laos": "laos", "latvia": "latvia", "lebanon": "lebanon",
  "lesotho": "lesotho", "liberia": "liberia", "madagascar": "madagascar",
  "malawi": "malawi", "malaysia": "malaysia", "mali": "mali",
  "malta": "malta", "mauritius": "mauritius", "mexico": "mexico",
  "moldova": "moldova", "montenegro": "montenegro", "morocco": "morocco",
  "mozambique": "mozambique", "namibia": "namibia", "nepal": "nepal",
  "netherlands": "netherlands", "new zealand": "new-zealand",
  "nicaragua": "nicaragua", "nigeria": "nigeria", "north macedonia": "north-macedonia",
  "norway": "norway", "oman": "oman", "pakistan": "pakistan",
  "panama": "panama", "papua new guinea": "papua-new-guinea",
  "paraguay": "paraguay", "peru": "peru", "philippines": "philippines",
  "poland": "poland", "portugal": "portugal", "qatar": "qatar",
  "romania": "romania", "russia": "russia", "rwanda": "rwanda",
  "saudi arabia": "saudi-arabia", "senegal": "senegal", "serbia": "serbia",
  "sierra leone": "sierra-leone", "singapore": "singapore",
  "slovakia": "slovakia", "slovenia": "slovenia", "somalia": "somalia",
  "south africa": "south-africa", "south korea": "south-korea",
  "spain": "spain", "sri lanka": "sri-lanka", "sudan": "sudan",
  "suriname": "suriname", "sweden": "sweden", "switzerland": "switzerland",
  "taiwan": "taiwan", "tajikistan": "tajikistan", "tanzania": "tanzania",
  "thailand": "thailand", "trinidad and tobago": "trinidad-and-tobago",
  "tunisia": "tunisia", "turkey": "turkey", "turkmenistan": "turkmenistan",
  "uganda": "uganda", "ukraine": "ukraine",
  "united arab emirates": "united-arab-emirates",
  "united kingdom": "united-kingdom", "uruguay": "uruguay",
  "uzbekistan": "uzbekistan", "vietnam": "vietnam", "zambia": "zambia",
  "zimbabwe": "zimbabwe",
};

// Sections most relevant to export pipeline (skip niche ones to save tokens)
const PRIORITY_SECTIONS = [
  "market-overview",
  "market-challenges",
  "market-opportunities",
  "market-entry-strategy",
  "trade-barriers",
  "import-tariffs",
  "import-requirements-and-documentation",
  "customs-regulations",
  "standards-for-trade",
  "trade-agreements",
  "distribution-and-sales-channels",
  "trade-financing",
  "ecommerce",
  "selling-factors-and-techniques",
];

// Alternate slug variants for inconsistent trade.gov URLs
const SLUG_VARIANTS: Record<string, string[]> = {
  "standards-for-trade": ["standards-trade", "trade-standards"],
  "distribution-and-sales-channels": ["distribution-sales-channels"],
  "import-requirements-and-documentation": ["import-requirements-documentation"],
  "labeling-and-marking-requirements": ["labelingmarking-requirements"],
  "prohibited-and-restricted-imports": ["prohibited-restricted-imports"],
  "us-export-controls": ["export-controls"],
  "selling-to-the-public-sector": ["selling-public-sector"],
  "business-travel": ["business-travel-and-etiquette"],
};

function getCountrySlug(country: string): string | null {
  const lower = country.toLowerCase().trim();
  return COUNTRY_SLUGS[lower] ?? null;
}

/**
 * Strip HTML to plain text.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract main content from a trade.gov page HTML.
 */
function extractContent(html: string): { content: string; lastUpdated?: string } {
  // Try to extract the main article content
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentMatch = html.match(/class="[^"]*field--name-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const rawHtml = contentMatch?.[1] ?? articleMatch?.[1] ?? mainMatch?.[1] ?? "";
  const content = htmlToText(rawHtml);

  // Try to extract last updated date
  const dateMatch = html.match(/(?:Last (?:Updated|Published|Modified)|Updated)[:\s]*([A-Z][a-z]+ \d{1,2},? \d{4})/i);
  const lastUpdated = dateMatch?.[1] ?? undefined;

  return { content: content.slice(0, 8000), lastUpdated }; // Cap at 8K chars per section
}

/**
 * Try fetching a section with fallback URL patterns.
 */
async function fetchSection(
  countrySlug: string,
  sectionSlug: string,
): Promise<{ content: string; url: string; lastUpdated?: string } | null> {
  const urlPatterns = [
    `https://www.trade.gov/country-commercial-guides/${countrySlug}-${sectionSlug}`,
    `https://www.trade.gov/knowledge-product/${countrySlug}-${sectionSlug}`,
    `https://www.trade.gov/knowledge-product/exporting-${countrySlug}-${sectionSlug}`,
  ];

  // Add slug variants
  const variants = SLUG_VARIANTS[sectionSlug] ?? [];
  for (const variant of variants) {
    urlPatterns.push(
      `https://www.trade.gov/country-commercial-guides/${countrySlug}-${variant}`,
      `https://www.trade.gov/knowledge-product/${countrySlug}-${variant}`,
    );
  }

  for (const url of urlPatterns) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "PropellerAI/1.0 (trade research tool)" },
      });
      if (response.ok) {
        const html = await response.text();
        const { content, lastUpdated } = extractContent(html);
        if (content.length > 100) {
          return { content, url, lastUpdated };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Fetch the country commercial guide for a given country.
 * On-demand with caching — only fetches when needed.
 */
export async function getCountryGuide(country: string): Promise<CountryGuide | null> {
  const slug = getCountrySlug(country);
  if (!slug) return null;

  // Check cache
  const cached = guideCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const sections: CountryGuideSection[] = [];

  // Fetch priority sections in parallel (batches of 4 to be respectful)
  for (let i = 0; i < PRIORITY_SECTIONS.length; i += 4) {
    const batch = PRIORITY_SECTIONS.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map((sectionSlug) => fetchSection(slug, sectionSlug)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value) {
        const sectionSlug = batch[j];
        sections.push({
          section: sectionSlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          slug: sectionSlug,
          content: result.value.content,
          url: result.value.url,
          lastUpdated: result.value.lastUpdated,
        });
      }
    }

    // Small delay between batches
    if (i + 4 < PRIORITY_SECTIONS.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (sections.length === 0) return null;

  const guide: CountryGuide = {
    country,
    sections,
    fetchedAt: new Date().toISOString(),
  };

  guideCache.set(slug, { data: guide, ts: Date.now() });
  return guide;
}

/**
 * Get relevant sections for the pipeline context.
 * Filters to sections most useful for market analysis and compliance.
 */
export function getGuideContextForPipeline(
  guide: CountryGuide,
  focus: "market" | "compliance" | "outreach" | "finance" = "market",
): string {
  const relevantSections: Record<string, string[]> = {
    market: [
      "market-overview", "market-challenges", "market-opportunities",
      "market-entry-strategy", "distribution-and-sales-channels",
    ],
    compliance: [
      "trade-barriers", "import-tariffs", "import-requirements-and-documentation",
      "customs-regulations", "standards-for-trade",
    ],
    outreach: [
      "market-entry-strategy", "distribution-and-sales-channels",
      "selling-factors-and-techniques", "ecommerce",
    ],
    finance: [
      "trade-financing", "import-tariffs", "trade-agreements",
    ],
  };

  const targetSlugs = relevantSections[focus] ?? relevantSections.market;

  const filtered = guide.sections
    .filter((s) => targetSlugs.includes(s.slug))
    .map((s) => `#### ${s.section}\n${s.content}\n*[Source: ${s.url}]*`)
    .join("\n\n");

  if (!filtered) return "";

  return `## Country Commercial Guide: ${guide.country}\n*Source: U.S. Department of Commerce, International Trade Administration*\n*Retrieved: ${guide.fetchedAt.split("T")[0]}*\n\n${filtered}`;
}

/**
 * Format guide data for inclusion in reports with citations.
 */
export function formatGuideForReport(guide: CountryGuide): string {
  let text = `### Country Intelligence: ${guide.country}\n`;
  text += `*Source: [Trade.gov Country Commercial Guide](https://www.trade.gov/country-commercial-guides) — U.S. International Trade Administration*\n\n`;

  for (const section of guide.sections.slice(0, 8)) {
    // Trim content for report inclusion
    const summary = section.content.slice(0, 500);
    text += `**${section.section}**\n`;
    text += `${summary}${section.content.length > 500 ? "..." : ""}\n`;
    text += `*[Full section: ${section.url}]*\n\n`;
  }

  return text;
}
