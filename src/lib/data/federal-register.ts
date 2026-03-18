/**
 * Federal Register API Integration
 *
 * Free API, no auth required. Full-text search of every Federal Register
 * document since 1994. Used to monitor regulatory changes affecting
 * export compliance — new BIS rules, Entity List additions, sanctions changes.
 *
 * Source: https://www.federalregister.gov/developers/documentation/api/v1
 * Format: JSON, CORS enabled
 */

export interface FederalRegisterDoc {
  title: string;
  type: "Rule" | "Proposed Rule" | "Notice" | "Presidential Document";
  abstract: string;
  documentNumber: string;
  publicationDate: string;
  agencies: string[];
  url: string;
  pdfUrl?: string;
  significantFlag: boolean;
}

// In-memory cache
let recentDocsCache: { data: FederalRegisterDoc[]; ts: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Trade-relevant agencies
const TRADE_AGENCIES = [
  "bureau-of-industry-and-security",
  "foreign-assets-control-office",
  "international-trade-administration",
  "customs-and-border-protection",
  "defense-trade-controls-directorate",
];

/**
 * Get recent trade compliance regulatory updates.
 * Returns the most recent Federal Register documents from BIS, OFAC, ITA, CBP, DDTC.
 */
export async function getRecentTradeRegulations(
  daysBack: number = 30,
  maxResults: number = 15,
): Promise<FederalRegisterDoc[]> {
  // Check cache
  if (recentDocsCache && Date.now() - recentDocsCache.ts < CACHE_TTL) {
    return recentDocsCache.data.slice(0, maxResults);
  }

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      "conditions[agencies][]": TRADE_AGENCIES.join(","),
      "conditions[publication_date][gte]": startDate.toISOString().split("T")[0],
      "conditions[publication_date][lte]": endDate.toISOString().split("T")[0],
      "per_page": String(maxResults),
      "order": "newest",
      "fields[]": "title,type,abstract,document_number,publication_date,agencies,html_url,pdf_url,significant",
    });

    // The Federal Register API requires agencies as separate params
    const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
    url.searchParams.set("per_page", String(maxResults));
    url.searchParams.set("order", "newest");
    url.searchParams.set("conditions[publication_date][gte]", startDate.toISOString().split("T")[0]);
    url.searchParams.set("conditions[publication_date][lte]", endDate.toISOString().split("T")[0]);

    for (const agency of TRADE_AGENCIES) {
      url.searchParams.append("conditions[agencies][]", agency);
    }

    url.searchParams.append("fields[]", "title");
    url.searchParams.append("fields[]", "type");
    url.searchParams.append("fields[]", "abstract");
    url.searchParams.append("fields[]", "document_number");
    url.searchParams.append("fields[]", "publication_date");
    url.searchParams.append("fields[]", "agencies");
    url.searchParams.append("fields[]", "html_url");
    url.searchParams.append("fields[]", "pdf_url");
    url.searchParams.append("fields[]", "significant");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: FederalRegisterDoc[] = (data.results || []).map(
      (doc: Record<string, unknown>) => ({
        title: doc.title as string,
        type: doc.type as FederalRegisterDoc["type"],
        abstract: ((doc.abstract as string) || "").slice(0, 500),
        documentNumber: doc.document_number as string,
        publicationDate: doc.publication_date as string,
        agencies: ((doc.agencies as Array<Record<string, string>>) || []).map(
          (a) => a.name || a.raw_name || "",
        ),
        url: doc.html_url as string,
        pdfUrl: doc.pdf_url as string,
        significantFlag: doc.significant as boolean,
      }),
    );

    recentDocsCache = { data: results, ts: Date.now() };
    return results.slice(0, maxResults);
  } catch {
    return [];
  }
}

/**
 * Search Federal Register for specific topics (e.g., "Entity List", "sanctions", a specific entity name).
 */
export async function searchFederalRegister(
  query: string,
  maxResults: number = 5,
): Promise<FederalRegisterDoc[]> {
  try {
    const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
    url.searchParams.set("conditions[term]", query);
    url.searchParams.set("per_page", String(maxResults));
    url.searchParams.set("order", "newest");

    for (const agency of TRADE_AGENCIES) {
      url.searchParams.append("conditions[agencies][]", agency);
    }

    url.searchParams.append("fields[]", "title");
    url.searchParams.append("fields[]", "type");
    url.searchParams.append("fields[]", "abstract");
    url.searchParams.append("fields[]", "document_number");
    url.searchParams.append("fields[]", "publication_date");
    url.searchParams.append("fields[]", "agencies");
    url.searchParams.append("fields[]", "html_url");
    url.searchParams.append("fields[]", "significant");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.results || []).map((doc: Record<string, unknown>) => ({
      title: doc.title as string,
      type: doc.type as FederalRegisterDoc["type"],
      abstract: ((doc.abstract as string) || "").slice(0, 500),
      documentNumber: doc.document_number as string,
      publicationDate: doc.publication_date as string,
      agencies: ((doc.agencies as Array<Record<string, string>>) || []).map(
        (a) => a.name || a.raw_name || "",
      ),
      url: doc.html_url as string,
      significantFlag: doc.significant as boolean,
    }));
  } catch {
    return [];
  }
}

/**
 * Format Federal Register docs for pipeline report context.
 */
export function formatRegulationsForReport(
  docs: FederalRegisterDoc[],
): string {
  if (docs.length === 0) return "";

  let text = `**Recent Regulatory Updates**\n`;
  text += `*Source: [Federal Register](https://www.federalregister.gov/) — Official daily publication of US government rules and notices*\n\n`;

  for (const doc of docs.slice(0, 5)) {
    const agencies = doc.agencies.join(", ");
    text += `- **${doc.title}** (${doc.publicationDate})\n`;
    text += `  ${doc.type} — ${agencies}\n`;
    if (doc.abstract) {
      text += `  ${doc.abstract.slice(0, 200)}${doc.abstract.length > 200 ? "..." : ""}\n`;
    }
    text += `  [View](${doc.url})\n\n`;
  }

  return text;
}
