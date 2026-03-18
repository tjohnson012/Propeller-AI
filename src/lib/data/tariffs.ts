/**
 * Tariff Rate Lookup
 *
 * Sources:
 * 1. Trade.gov FTA Tariff Rates API — preferential rates under US FTAs
 *    https://developer.trade.gov/tariff-rates.html
 * 2. World Bank WITS API — MFN applied rates for non-FTA countries
 *    https://wits.worldbank.org/API/V1/
 *
 * Both are free, no auth required for WITS. Trade.gov needs free API key.
 */

export interface TariffRate {
  hsCode: string;
  country: string;
  mfnRate?: string;
  preferentialRate?: string;
  ftaName?: string;
  phaseOutSchedule?: string;
  finalRate?: string;
  finalYear?: number;
  source: string;
}

// In-memory cache
const tariffCache = new Map<string, { data: TariffRate[]; ts: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (tariff rates change infrequently)

// Countries with US FTAs (mapped to trade.gov source codes)
const FTA_COUNTRIES: Record<string, { code: string; ftaName: string }> = {
  "australia": { code: "AU", ftaName: "US-Australia FTA" },
  "bahrain": { code: "BH", ftaName: "US-Bahrain FTA" },
  "chile": { code: "CL", ftaName: "US-Chile FTA" },
  "colombia": { code: "CO", ftaName: "US-Colombia TPA" },
  "costa rica": { code: "CR", ftaName: "CAFTA-DR" },
  "dominican republic": { code: "DO", ftaName: "CAFTA-DR" },
  "el salvador": { code: "SV", ftaName: "CAFTA-DR" },
  "guatemala": { code: "GT", ftaName: "CAFTA-DR" },
  "honduras": { code: "HN", ftaName: "CAFTA-DR" },
  "israel": { code: "IL", ftaName: "US-Israel FTA" },
  "jordan": { code: "JO", ftaName: "US-Jordan FTA" },
  "south korea": { code: "KR", ftaName: "KORUS FTA" },
  "morocco": { code: "MA", ftaName: "US-Morocco FTA" },
  "nicaragua": { code: "NI", ftaName: "CAFTA-DR" },
  "oman": { code: "OM", ftaName: "US-Oman FTA" },
  "panama": { code: "PA", ftaName: "US-Panama TPA" },
  "peru": { code: "PE", ftaName: "US-Peru TPA" },
  "singapore": { code: "SG", ftaName: "US-Singapore FTA" },
  "canada": { code: "CA", ftaName: "USMCA" },
  "mexico": { code: "MX", ftaName: "USMCA" },
};

/**
 * Look up tariff rates for a product + destination country.
 */
export async function getTariffRates(
  hsCode: string,
  country: string,
): Promise<TariffRate[]> {
  const cleanHS = hsCode.replace(/\./g, "");
  const countryLower = country.toLowerCase();
  const cacheKey = `${cleanHS}-${countryLower}`;

  const cached = tariffCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const rates: TariffRate[] = [];

  // 1. Check for FTA preferential rate
  const ftaInfo = FTA_COUNTRIES[countryLower];
  if (ftaInfo) {
    try {
      const ftaRates = await fetchFTATariffRate(cleanHS, ftaInfo.code);
      for (const rate of ftaRates) {
        rates.push({
          hsCode: cleanHS,
          country,
          preferentialRate: rate.rate,
          ftaName: ftaInfo.ftaName,
          phaseOutSchedule: rate.stagingBasket,
          finalRate: rate.finalRate,
          finalYear: rate.finalYear,
          source: `Trade.gov FTA Tariff Rates API — ${ftaInfo.ftaName}`,
        });
      }
    } catch {
      // FTA lookup is supplemental
    }
  }

  // 2. Get MFN rate from WITS
  try {
    const mfnRate = await fetchWITSMFNRate(cleanHS, country);
    if (mfnRate) {
      rates.push({
        hsCode: cleanHS,
        country,
        mfnRate: mfnRate.rate,
        source: `World Bank WITS — MFN Applied Tariff Rate`,
      });
    }
  } catch {
    // WITS is supplemental
  }

  tariffCache.set(cacheKey, { data: rates, ts: Date.now() });
  return rates;
}

/**
 * Fetch FTA tariff rate from trade.gov API.
 */
async function fetchFTATariffRate(
  hsCode: string,
  countryCode: string,
): Promise<Array<{ rate: string; stagingBasket?: string; finalRate?: string; finalYear?: number }>> {
  const apiKey = process.env.TRADE_GOV_API_KEY;
  if (!apiKey) return [];

  try {
    const hs6 = hsCode.slice(0, 6);
    const url = `https://api.trade.gov/gateway/v1/tariff_rates/search?sources=${countryCode}&hs6=${hs6}&size=5`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];

    return results.map((r: Record<string, unknown>) => ({
      rate: String(r.alt_rate_duty ?? r.base_rate ?? "N/A"),
      stagingBasket: r.tariff_rate_staging_basket as string | undefined,
      finalRate: r.final_year_rate ? String(r.final_year_rate) : undefined,
      finalYear: r.final_year ? Number(r.final_year) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch MFN applied tariff rate from World Bank WITS API.
 * Free, no auth required.
 */
async function fetchWITSMFNRate(
  hsCode: string,
  country: string,
): Promise<{ rate: string } | null> {
  // WITS uses ISO3 country codes
  const iso3Map: Record<string, string> = {
    "germany": "DEU", "japan": "JPN", "china": "CHN", "mexico": "MEX",
    "brazil": "BRA", "india": "IND", "united kingdom": "GBR", "france": "FRA",
    "italy": "ITA", "south korea": "KOR", "canada": "CAN", "australia": "AUS",
    "netherlands": "NLD", "saudi arabia": "SAU", "uae": "ARE",
    "united arab emirates": "ARE", "singapore": "SGP", "vietnam": "VNM",
    "thailand": "THA", "colombia": "COL", "chile": "CHL", "peru": "PER",
    "turkey": "TUR", "poland": "POL", "taiwan": "TWN", "malaysia": "MYS",
    "indonesia": "IDN", "philippines": "PHL", "nigeria": "NGA",
    "south africa": "ZAF", "kenya": "KEN", "egypt": "EGY", "morocco": "MAR",
    "argentina": "ARG", "pakistan": "PAK", "bangladesh": "BGD",
    "israel": "ISR", "jordan": "JOR", "panama": "PAN",
  };

  const iso3 = iso3Map[country.toLowerCase()];
  if (!iso3) return null;

  try {
    const hs6 = hsCode.slice(0, 6);
    const url = `https://wits.worldbank.org/API/V1/SDMX/V21/rest/data/DF_WITS_Tariff_TRAINS/A.${iso3}.MFN.${hs6}?startPeriod=2020&endPeriod=2024&format=jsondata`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Parse SDMX JSON response — look for observation values
    const observations = data?.dataSets?.[0]?.observations;
    if (!observations) return null;

    // Get the most recent observation
    const keys = Object.keys(observations).sort().reverse();
    if (keys.length === 0) return null;

    const value = observations[keys[0]]?.[0];
    if (value === undefined || value === null) return null;

    return { rate: `${Number(value).toFixed(1)}%` };
  } catch {
    return null;
  }
}

/**
 * Format tariff data for pipeline report.
 */
export function formatTariffForReport(rates: TariffRate[], country: string): string {
  if (rates.length === 0) return "";

  let text = `**Tariff Rates — ${country}**\n\n`;

  const ftaRate = rates.find((r) => r.ftaName);
  const mfnRate = rates.find((r) => r.mfnRate);

  if (mfnRate) {
    text += `- **MFN Applied Rate:** ${mfnRate.mfnRate}\n`;
    text += `  *Source: ${mfnRate.source}*\n`;
  }

  if (ftaRate) {
    text += `- **Preferential Rate (${ftaRate.ftaName}):** ${ftaRate.preferentialRate}\n`;
    if (ftaRate.phaseOutSchedule) {
      text += `  Phase-out basket: ${ftaRate.phaseOutSchedule}\n`;
    }
    if (ftaRate.finalRate && ftaRate.finalYear) {
      text += `  Final rate: ${ftaRate.finalRate} by ${ftaRate.finalYear}\n`;
    }
    text += `  *Source: ${ftaRate.source}*\n`;
  }

  if (!ftaRate && !mfnRate) {
    text += `No specific tariff rate data available for this HS code in ${country}.\n`;
  }

  return text;
}
