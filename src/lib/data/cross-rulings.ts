/**
 * CBP CROSS (Customs Rulings Online Search System) integration.
 * Fetches binding classification rulings from rulings.cbp.gov.
 * Free public API, no authentication required.
 */

export interface CrossRuling {
  rulingNumber: string;
  subject: string;
  rulingDate: string;
  tariffs: string[];
  collection: string;
  isRevoked: boolean;
  fullText?: string;
  url: string;
}

interface CrossSearchResponse {
  rulings: Array<{
    id: number;
    rulingNumber: string;
    subject: string;
    categories: string;
    rulingDate: string;
    tariffs: string[];
    collection: string;
    operationallyRevoked: boolean;
    isRevokedByOperationalLaw: boolean;
  }>;
  totalHits: number;
}

const CROSS_API = "https://rulings.cbp.gov/api";

// In-memory cache: key → { data, timestamp }
const cache = new Map<string, { data: CrossRuling[]; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search CROSS rulings by HS code or product description.
 * Returns the top rulings with classification reasoning.
 */
export async function searchCrossRulings(
  query: string,
  maxResults: number = 5,
): Promise<CrossRuling[]> {
  const cacheKey = `${query}:${maxResults}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${CROSS_API}/search?term=${encodeURIComponent(query)}&pageSize=${maxResults}&sortBy=relevance`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const data: CrossSearchResponse = await response.json();

    const rulings: CrossRuling[] = data.rulings
      .filter((r) => !r.operationallyRevoked && !r.isRevokedByOperationalLaw)
      .filter((r) => r.categories === "Classification")
      .slice(0, maxResults)
      .map((r) => ({
        rulingNumber: r.rulingNumber,
        subject: r.subject,
        rulingDate: r.rulingDate.split("T")[0],
        tariffs: r.tariffs,
        collection: r.collection === "ny" ? "New York" : "Headquarters",
        isRevoked: false,
        url: `https://rulings.cbp.gov/ruling/${r.rulingNumber}`,
      }));

    cache.set(cacheKey, { data: rulings, ts: Date.now() });
    return rulings;
  } catch {
    return [];
  }
}

/**
 * Fetch the full text of a specific ruling.
 * Contains the complete classification reasoning.
 */
export async function getRulingDetail(rulingNumber: string): Promise<CrossRuling | null> {
  try {
    const response = await fetch(`${CROSS_API}/ruling/${encodeURIComponent(rulingNumber)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const r = await response.json();
    return {
      rulingNumber: r.rulingNumber,
      subject: r.subject,
      rulingDate: r.rulingDate?.split("T")[0] ?? "",
      tariffs: r.tariffs ?? [],
      collection: r.collection === "ny" ? "New York" : "Headquarters",
      isRevoked: r.operationallyRevoked || r.isRevokedByOperationalLaw,
      fullText: r.text ?? undefined,
      url: `https://rulings.cbp.gov/ruling/${r.rulingNumber}`,
    };
  } catch {
    return null;
  }
}

/**
 * Format rulings into a readable section for reports.
 */
export function formatRulingsForReport(rulings: CrossRuling[]): string {
  if (rulings.length === 0) {
    return "No CBP binding rulings found for this product classification.";
  }

  let text = `### CBP Binding Rulings\n\n`;
  text += `Found ${rulings.length} relevant classification ruling(s) from U.S. Customs and Border Protection:\n\n`;

  for (const r of rulings) {
    text += `**${r.rulingNumber}** (${r.rulingDate}, ${r.collection})\n`;
    text += `${r.subject}\n`;
    if (r.tariffs.length > 0) {
      text += `Classified under: ${r.tariffs.join(", ")}\n`;
    }
    text += `[View full ruling](${r.url})\n\n`;
  }

  text += `*Source: [CBP CROSS Database](https://rulings.cbp.gov) — Legally binding classification decisions*\n`;
  return text;
}
