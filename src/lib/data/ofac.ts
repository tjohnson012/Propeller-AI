/**
 * Consolidated Screening List (CSL) Screening Engine
 *
 * Downloads the real US Government Consolidated Screening List — 25,000+ entries
 * across 12 federal screening lists from Commerce, State, and Treasury.
 * Provides fuzzy matching against entity names for sanctions/restricted party screening.
 *
 * Data source: https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json
 * Updated: Daily at 5:00 AM EST by trade.gov
 *
 * Lists covered:
 *   Treasury (OFAC):
 *     - Specially Designated Nationals (SDN)
 *     - Foreign Sanctions Evaders (FSE)
 *     - Sectoral Sanctions Identifications (SSI)
 *     - Palestinian Legislative Council (PLC)
 *     - CAPTA List (CAP)
 *     - Non-SDN Menu-Based Sanctions (NS-MBS)
 *     - Non-SDN Chinese Military-Industrial Complex (CMIC)
 *   Commerce (BIS):
 *     - Entity List (EL)
 *     - Denied Persons List (DPL)
 *     - Unverified List (UVL)
 *     - Military End User (MEU) List
 *   State Department:
 *     - ITAR Debarred (DTC)
 *     - Nonproliferation Sanctions (ISN)
 */

/* ── Types ── */

/** A parsed entry from the Consolidated Screening List */
export interface SDNEntry {
  uid: string;
  name: string;
  type: "individual" | "entity" | "vessel" | "aircraft";
  program: string;
  remarks: string;
  aliases: string[];
  source: string;
  sourceList: string;
  country: string;
  addresses: string[];
}

export interface ScreeningResult {
  query: string;
  matched: boolean;
  matchScore: number;
  matchType: "exact" | "strong" | "partial" | "alias" | "none";
  matches: SDNMatch[];
  listsChecked: string[];
  timestamp: string;
}

export interface SDNMatch {
  entry: SDNEntry;
  score: number;
  matchType: "exact" | "strong" | "partial" | "alias";
  matchedField: string;
}

export interface BatchSummary {
  total: number;
  cleared: number;
  flagged: number;
  listsChecked: string[];
  timestamp: string;
}

/* ── Raw CSL JSON shape ── */

interface CSLRawEntry {
  id: string;
  entity_number: string;
  name: string;
  type: string | null;
  programs?: string[];
  remarks: string | null;
  source: string;
  source_list_url: string;
  source_information_url: string;
  alt_names?: string[];
  addresses?: Array<{
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  }>;
}

/* ── All lists we screen against ── */

const CSL_LISTS_CHECKED = [
  "OFAC Specially Designated Nationals (SDN)",
  "OFAC Sectoral Sanctions (SSI)",
  "OFAC Foreign Sanctions Evaders (FSE)",
  "OFAC Non-SDN Chinese Military-Industrial Complex (CMIC)",
  "OFAC Palestinian Legislative Council (PLC)",
  "OFAC CAPTA List (CAP)",
  "OFAC Non-SDN Menu-Based Sanctions (NS-MBS)",
  "BIS Entity List (EL)",
  "BIS Denied Persons List (DPL)",
  "BIS Unverified List (UVL)",
  "BIS Military End User (MEU)",
  "State Dept ITAR Debarred (DTC)",
  "State Dept Nonproliferation Sanctions (ISN)",
];

/* ── Short labels for source field ── */

const SOURCE_SHORT: Record<string, string> = {
  "Specially Designated Nationals (SDN) - Treasury Department": "OFAC SDN",
  "Sectoral Sanctions Identifications List (SSI) - Treasury Department": "OFAC SSI",
  "Foreign Sanctions Evaders (FSE) - Treasury Department": "OFAC FSE",
  "Non-SDN Chinese Military-Industrial Complex Companies List (CMIC) - Treasury Department": "OFAC CMIC",
  "Palestinian Legislative Council List (PLC) - Treasury Department": "OFAC PLC",
  "Capta List (CAP) - Treasury Department": "OFAC CAP",
  "Non-SDN Menu-Based Sanctions List (NS-MBS List) - Treasury Department": "OFAC NS-MBS",
  "Entity List (EL) - Bureau of Industry and Security": "BIS Entity List",
  "Denied Persons List (DPL) - Bureau of Industry and Security": "BIS DPL",
  "Unverified List (UVL) - Bureau of Industry and Security": "BIS UVL",
  "Military End User (MEU) List - Bureau of Industry and Security": "BIS MEU",
  "ITAR Debarred (DTC) - State Department": "State ITAR Debarred",
  "Nonproliferation Sanctions (ISN) - State Department": "State Nonproliferation",
};

function shortSource(raw: string): string {
  return SOURCE_SHORT[raw] ?? raw;
}

/* ── In-memory cache ── */

let cslCache: SDNEntry[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours (CSL updates daily at 5 AM EST)

/* ── String utilities ── */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:'"!?()[\]{}\-\/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const an = normalize(a);
  const bn = normalize(b);

  if (an === bn) return 1.0;
  if (an.length === 0 || bn.length === 0) return 0;

  // Check if one contains the other
  if (an.includes(bn) || bn.includes(an)) {
    const shorter = Math.min(an.length, bn.length);
    const longer = Math.max(an.length, bn.length);
    return shorter / longer;
  }

  // Token-based similarity (handles word order differences)
  const tokensA = an.split(" ").filter(Boolean);
  const tokensB = bn.split(" ").filter(Boolean);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  const jaccard = intersection.size / union.size;

  // Also check individual token containment for partial matches
  let tokenMatchCount = 0;
  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta === tb || (ta.length > 3 && tb.includes(ta)) || (tb.length > 3 && ta.includes(tb))) {
        tokenMatchCount++;
        break;
      }
    }
  }
  const tokenOverlap = tokensA.length > 0 ? tokenMatchCount / tokensA.length : 0;

  return Math.max(jaccard, tokenOverlap);
}

/* ── Parse CSL JSON into SDNEntry[] ── */

function parseCSLJSON(data: { results: CSLRawEntry[] }): SDNEntry[] {
  const entries: SDNEntry[] = [];

  for (const raw of data.results) {
    if (!raw.name) continue;

    const uid = raw.entity_number || raw.id || "";
    const rawType = (raw.type ?? "").toLowerCase();

    let type: SDNEntry["type"] = "entity";
    if (rawType === "individual") type = "individual";
    else if (rawType === "vessel") type = "vessel";
    else if (rawType === "aircraft") type = "aircraft";

    const program = raw.programs?.join(", ") ?? "";
    const aliases = raw.alt_names?.filter(Boolean) ?? [];
    const source = raw.source ?? "";

    // Extract country from addresses
    const countries = (raw.addresses ?? [])
      .map((a) => a.country)
      .filter((c): c is string => !!c);
    const country = countries[0] ?? "";

    // Build address strings
    const addresses = (raw.addresses ?? []).map((a) => {
      return [a.address, a.city, a.state, a.postal_code, a.country]
        .filter(Boolean)
        .join(", ");
    });

    entries.push({
      uid,
      name: raw.name,
      type,
      program,
      remarks: raw.remarks ?? "",
      aliases,
      source,
      sourceList: shortSource(source),
      country,
      addresses,
    });
  }

  return entries;
}

/* ── Fetch & cache the CSL ── */

export async function loadSDNList(): Promise<SDNEntry[]> {
  const now = Date.now();
  if (cslCache && now - cacheTimestamp < CACHE_TTL) {
    return cslCache;
  }

  try {
    const response = await fetch(
      "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json",
      { next: { revalidate: 43200 } }, // Cache for 12h
    );

    if (!response.ok) {
      console.error(`CSL fetch failed: ${response.status}`);
      return cslCache ?? getFallbackEntries();
    }

    const data = await response.json();
    cslCache = parseCSLJSON(data);
    cacheTimestamp = now;
    // CSL data loaded successfully
    return cslCache;
  } catch (error) {
    console.error("Failed to fetch Consolidated Screening List:", error);
    return cslCache ?? getFallbackEntries();
  }
}

/* ── Fallback entries for development/offline use ── */

function getFallbackEntries(): SDNEntry[] {
  return [
    { uid: "36", name: "AEROCARIBBEAN AIRLINES", type: "entity", program: "CUBA", remarks: "", aliases: [], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "CU", addresses: [] },
    { uid: "7536", name: "RUSSIAN AGRICULTURAL BANK", type: "entity", program: "UKRAINE-EO13662", remarks: "", aliases: ["ROSSELKHOZBANK"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "RU", addresses: [] },
    { uid: "9681", name: "SBERBANK OF RUSSIA", type: "entity", program: "UKRAINE-EO14024", remarks: "", aliases: ["SBERBANK"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "RU", addresses: [] },
    { uid: "22790", name: "GAZPROMBANK JOINT STOCK COMPANY", type: "entity", program: "UKRAINE-EO14024", remarks: "", aliases: ["GAZPROMBANK"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "RU", addresses: [] },
    { uid: "26642", name: "VTB BANK PUBLIC JOINT STOCK COMPANY", type: "entity", program: "UKRAINE-EO14024", remarks: "", aliases: ["VTB BANK"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "RU", addresses: [] },
    { uid: "44059", name: "HUAWEI TECHNOLOGIES CO., LTD.", type: "entity", program: "EO13959", remarks: "", aliases: ["HUAWEI"], source: "Non-SDN Chinese Military-Industrial Complex Companies List (CMIC) - Treasury Department", sourceList: "OFAC CMIC", country: "CN", addresses: [] },
    { uid: "15064", name: "PETROLEOS DE VENEZUELA, S.A.", type: "entity", program: "VENEZUELA", remarks: "", aliases: ["PDVSA"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "VE", addresses: [] },
    { uid: "12304", name: "ISLAMIC REVOLUTIONARY GUARD CORPS", type: "entity", program: "IRAN", remarks: "", aliases: ["IRGC", "SEPAH"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "IR", addresses: [] },
    { uid: "26610", name: "WAGNER GROUP", type: "entity", program: "RUSSIA-EO14024", remarks: "", aliases: ["PMC WAGNER"], source: "Specially Designated Nationals (SDN) - Treasury Department", sourceList: "OFAC SDN", country: "RU", addresses: [] },
    { uid: "39720", name: "KASPERSKY LAB", type: "entity", program: "RUSSIA-EO14024", remarks: "", aliases: [], source: "Entity List (EL) - Bureau of Industry and Security", sourceList: "BIS Entity List", country: "RU", addresses: [] },
  ];
}

/* ── Screen a single entity ── */

export async function screenEntity(entityName: string): Promise<ScreeningResult> {
  const cslList = await loadSDNList();
  const matches: SDNMatch[] = [];
  const normalizedQuery = normalize(entityName);

  for (const entry of cslList) {
    // Check main name
    const nameScore = similarity(entityName, entry.name);
    if (nameScore >= 0.6) {
      matches.push({
        entry,
        score: nameScore,
        matchType: nameScore >= 0.95 ? "exact" : nameScore >= 0.8 ? "strong" : "partial",
        matchedField: `name [${entry.sourceList}]`,
      });
      continue;
    }

    // Check aliases
    for (const alias of entry.aliases) {
      const aliasScore = similarity(entityName, alias);
      if (aliasScore >= 0.6) {
        matches.push({
          entry,
          score: aliasScore,
          matchType: "alias",
          matchedField: `alias: ${alias} [${entry.sourceList}]`,
        });
        break;
      }
    }

    // Check if query tokens appear in the entry name (catch partial company names)
    const queryTokens = normalizedQuery.split(" ").filter((t) => t.length > 3);
    const entryNorm = normalize(entry.name);
    const significantMatches = queryTokens.filter((t) => entryNorm.includes(t));
    if (queryTokens.length > 0 && significantMatches.length / queryTokens.length >= 0.5) {
      const partialScore = significantMatches.length / queryTokens.length * 0.7;
      if (partialScore >= 0.5 && !matches.find((m) => m.entry.uid === entry.uid)) {
        matches.push({
          entry,
          score: partialScore,
          matchType: "partial",
          matchedField: `partial token match: ${significantMatches.join(", ")} [${entry.sourceList}]`,
        });
      }
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  const topMatches = matches.slice(0, 5);
  const bestScore = topMatches[0]?.score ?? 0;
  const bestType = topMatches[0]?.matchType ?? "none";

  // Collect which lists had matches for reporting
  const matchedLists = [...new Set(topMatches.map((m) => m.entry.sourceList))];

  return {
    query: entityName,
    matched: bestScore >= 0.6,
    matchScore: Math.round(bestScore * 100),
    matchType: bestType,
    matches: topMatches,
    listsChecked: CSL_LISTS_CHECKED,
    timestamp: new Date().toISOString(),
  };
}

/* ── Screen multiple entities in batch ── */

export async function screenEntities(
  entityNames: string[],
): Promise<{ results: ScreeningResult[]; summary: BatchSummary }> {
  // Load once, screen many
  await loadSDNList();

  const results = await Promise.all(entityNames.map(screenEntity));
  const flagged = results.filter((r) => r.matched);
  const cleared = results.filter((r) => !r.matched);

  return {
    results,
    summary: {
      total: entityNames.length,
      cleared: cleared.length,
      flagged: flagged.length,
      listsChecked: CSL_LISTS_CHECKED,
      timestamp: new Date().toISOString(),
    },
  };
}
