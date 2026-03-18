/**
 * Census Bureau International Trade API
 *
 * Provides US-specific export/import statistics at HS-10 level granularity.
 * More timely than Comtrade (monthly with ~6-week lag vs 6-12 months).
 * Includes state-level export data for SBDC regional analysis.
 *
 * Source: https://api.census.gov/data/timeseries/intltrade/
 * Auth: Free API key from https://api.census.gov/data/key_signup.html (optional, higher limits)
 * No key = 500 calls/day
 */

export interface CensusTradeFlow {
  hsCode: string;
  country: string;
  countryCode: string;
  year: number;
  month?: number;
  exportValue: number;
  importValue: number;
  quantity?: number;
  unit?: string;
}

export interface CensusStateExport {
  state: string;
  stateCode: string;
  naics: string;
  year: number;
  exportValue: number;
}

// In-memory cache
let tradeCache: Map<string, { data: CensusTradeFlow[]; ts: number }> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Country code mapping (ISO 2-letter to Census numeric)
const COUNTRY_CODES: Record<string, string> = {
  "germany": "4280", "japan": "5880", "china": "5700", "mexico": "2010",
  "brazil": "3510", "india": "5330", "united kingdom": "4120", "france": "4270",
  "italy": "4759", "south korea": "5800", "canada": "1220", "australia": "6021",
  "netherlands": "4210", "saudi arabia": "5170", "uae": "5200", "united arab emirates": "5200",
  "singapore": "5590", "vietnam": "5520", "thailand": "5490", "colombia": "3010",
  "chile": "3370", "peru": "3330", "turkey": "4890", "poland": "4550",
  "taiwan": "5830", "malaysia": "5570", "indonesia": "5600", "philippines": "5660",
  "nigeria": "7530", "south africa": "7910", "kenya": "7600", "egypt": "7290",
  "morocco": "7140", "argentina": "3570", "pakistan": "5350", "bangladesh": "5380",
  "israel": "5030", "jordan": "5110", "panama": "2320",
};

function getCountryCode(country: string): string | null {
  return COUNTRY_CODES[country.toLowerCase()] || null;
}

/**
 * Get US trade data for a specific HS code and country.
 * Returns annual data for the most recent 3 years.
 */
export async function getUSTradeData(
  hsCode: string,
  country: string,
): Promise<CensusTradeFlow[]> {
  const cleanHS = hsCode.replace(/\./g, "").slice(0, 6); // Census uses HS-6 minimum
  const countryCode = getCountryCode(country);
  const cacheKey = `${cleanHS}-${countryCode || country}`;

  // Check cache
  const cached = tradeCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = process.env.CENSUS_API_KEY || "";
    const keyParam = apiKey ? `&key=${apiKey}` : "";

    // Fetch exports
    const exportUrl = `https://api.census.gov/data/timeseries/intltrade/exports/hs?get=ALL_VAL_YR,QY1_YR&COMM_LVL=HS6&I_COMMODITY=${cleanHS}${countryCode ? `&CTY_CODE=${countryCode}` : ""}&time=from+2021+to+2024${keyParam}`;

    const exportRes = await fetch(exportUrl, {
      signal: AbortSignal.timeout(15000),
    });

    const flows: CensusTradeFlow[] = [];

    if (exportRes.ok) {
      const exportData = await exportRes.json();
      // Census API returns arrays: first row is headers, rest are data
      if (Array.isArray(exportData) && exportData.length > 1) {
        const headers = exportData[0] as string[];
        const valIdx = headers.indexOf("ALL_VAL_YR");
        const qtyIdx = headers.indexOf("QY1_YR");
        const timeIdx = headers.indexOf("time");
        const ctyIdx = headers.indexOf("CTY_CODE");

        for (let i = 1; i < exportData.length; i++) {
          const row = exportData[i];
          const value = parseInt(row[valIdx] || "0", 10);
          const qty = parseInt(row[qtyIdx] || "0", 10);
          const year = parseInt(row[timeIdx] || "0", 10);

          if (value > 0) {
            flows.push({
              hsCode: cleanHS,
              country,
              countryCode: row[ctyIdx] || countryCode || "",
              year,
              exportValue: value,
              importValue: 0,
              quantity: qty > 0 ? qty : undefined,
            });
          }
        }
      }
    }

    // Try to fetch imports too
    try {
      const importUrl = `https://api.census.gov/data/timeseries/intltrade/imports/hs?get=GEN_VAL_YR&COMM_LVL=HS6&I_COMMODITY=${cleanHS}${countryCode ? `&CTY_CODE=${countryCode}` : ""}&time=from+2021+to+2024${keyParam}`;

      const importRes = await fetch(importUrl, {
        signal: AbortSignal.timeout(15000),
      });

      if (importRes.ok) {
        const importData = await importRes.json();
        if (Array.isArray(importData) && importData.length > 1) {
          const headers = importData[0] as string[];
          const valIdx = headers.indexOf("GEN_VAL_YR");
          const timeIdx = headers.indexOf("time");

          for (let i = 1; i < importData.length; i++) {
            const row = importData[i];
            const value = parseInt(row[valIdx] || "0", 10);
            const year = parseInt(row[timeIdx] || "0", 10);

            // Merge with existing export flow for same year
            const existing = flows.find((f) => f.year === year);
            if (existing) {
              existing.importValue = value;
            } else if (value > 0) {
              flows.push({
                hsCode: cleanHS,
                country,
                countryCode: countryCode || "",
                year,
                exportValue: 0,
                importValue: value,
              });
            }
          }
        }
      }
    } catch {
      // Import data is supplemental, OK to fail
    }

    // Sort by year
    flows.sort((a, b) => a.year - b.year);

    tradeCache.set(cacheKey, { data: flows, ts: Date.now() });
    return flows;
  } catch {
    return [];
  }
}

/**
 * Format Census trade data for pipeline report.
 */
export function formatCensusTradeForReport(
  flows: CensusTradeFlow[],
  country: string,
): string {
  if (flows.length === 0) return "";

  let text = `**US Trade Data — ${country}**\n`;
  text += `*Source: [U.S. Census Bureau International Trade](https://api.census.gov/data/timeseries/intltrade/) — Official US trade statistics*\n\n`;

  for (const flow of flows) {
    const exportStr = flow.exportValue > 0 ? formatValue(flow.exportValue) : "N/A";
    const importStr = flow.importValue > 0 ? formatValue(flow.importValue) : "N/A";
    text += `- **${flow.year}**: US exports ${exportStr} | US imports ${importStr}`;
    if (flow.quantity) text += ` (${flow.quantity.toLocaleString()} units)`;
    text += `\n`;
  }

  // Calculate trend
  if (flows.length >= 2) {
    const latest = flows[flows.length - 1];
    const prev = flows[flows.length - 2];
    if (latest.exportValue > 0 && prev.exportValue > 0) {
      const pctChange = ((latest.exportValue - prev.exportValue) / prev.exportValue) * 100;
      const direction = pctChange > 0 ? "increased" : "decreased";
      text += `\n*Trend: US exports ${direction} ${Math.abs(pctChange).toFixed(1)}% year-over-year*\n`;
    }
  }

  return text;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}
