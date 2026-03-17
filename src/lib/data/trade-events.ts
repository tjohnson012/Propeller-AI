/**
 * Trade event / trade show calendar data.
 * Primary: USTDA RSS feed (public, no auth).
 * Secondary: ITA Trade Events API (requires free API key via developer.trade.gov).
 *
 * Source: https://ustda.gov/feed/?post_type=event
 * Source: https://developer.trade.gov (ITA Data Services Platform)
 */

export interface TradeEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  country: string;
  industries: string[];
  url: string;
  registrationUrl?: string;
  source: string;
  cost?: string;
}

// In-memory cache
let eventsCache: { data: TradeEvent[]; ts: number } | null = null;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Parse USTDA RSS feed for trade events.
 */
async function fetchUSTDAEvents(): Promise<TradeEvent[]> {
  try {
    const response = await fetch("https://ustda.gov/feed/?post_type=event", {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "PropellerAI/1.0 (trade research tool)" },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const events: TradeEvent[] = [];

    // Parse RSS items
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        ?? item.match(/<description>(.*?)<\/description>/)?.[1] ?? "";
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const content = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] ?? "";

      // Extract date, location, and industry from content
      const dateMatch = content.match(/(?:Date|When)[:\s]*([\w\s,]+\d{4})/i);
      const locationMatch = content.match(/(?:Location|Where|Venue)[:\s]*([\w\s,]+)/i);

      // Determine country from title/description
      const countryHints = extractCountries(title + " " + description);

      // Determine industries from content
      const industryHints = extractIndustries(title + " " + description + " " + content);

      // Clean description
      const cleanDesc = description
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      events.push({
        id: `ustda-${Buffer.from(link).toString("base64").slice(0, 12)}`,
        name: title,
        description: cleanDesc,
        startDate: dateMatch?.[1] ?? pubDate,
        location: locationMatch?.[1]?.trim() ?? "",
        country: countryHints[0] ?? "United States",
        industries: industryHints,
        url: link,
        source: "U.S. Trade and Development Agency",
      });
    }

    return events;
  } catch {
    return [];
  }
}

/**
 * Fetch ITA Trade Events (requires TRADE_GOV_API_KEY env var).
 */
async function fetchITAEvents(
  industries?: string[],
  countries?: string[],
): Promise<TradeEvent[]> {
  const apiKey = process.env.TRADE_GOV_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams();
    const now = new Date();
    const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    params.set("start_date_range[from]", now.toISOString().split("T")[0]);
    params.set("start_date_range[to]", sixMonths.toISOString().split("T")[0]);
    params.set("size", "50");

    if (industries?.length) params.set("industries", industries.join(","));
    if (countries?.length) params.set("countries", countries.join(","));

    const response = await fetch(
      `https://api.trade.gov/gateway/v1/trade_events/search?${params.toString()}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.results ?? []).map((e: Record<string, unknown>) => ({
      id: `ita-${e.id}`,
      name: e.name as string,
      description: ((e.description as string) ?? "").slice(0, 500),
      startDate: e.start_date as string,
      endDate: e.end_date as string,
      location: Array.isArray(e.venues) && e.venues.length > 0
        ? `${(e.venues[0] as Record<string, string>).city ?? ""}, ${(e.venues[0] as Record<string, string>).country ?? ""}`
        : "",
      country: Array.isArray(e.venues) && e.venues.length > 0
        ? (e.venues[0] as Record<string, string>).country ?? ""
        : "",
      industries: (e.industries as string[]) ?? [],
      url: e.url as string,
      registrationUrl: e.registration_url as string,
      cost: e.cost !== undefined ? String(e.cost) : undefined,
      source: "International Trade Administration",
    }));
  } catch {
    return [];
  }
}

/**
 * Get upcoming trade events filtered by industry and/or target countries.
 */
export async function getTradeEvents(
  options: {
    industries?: string[];
    countries?: string[];
    maxResults?: number;
  } = {},
): Promise<TradeEvent[]> {
  const { industries, countries, maxResults = 20 } = options;

  // Check cache for unfiltered results
  if (!eventsCache || Date.now() - eventsCache.ts > CACHE_TTL) {
    const [ustdaEvents, itaEvents] = await Promise.allSettled([
      fetchUSTDAEvents(),
      fetchITAEvents(industries, countries),
    ]);

    const allEvents = [
      ...(ustdaEvents.status === "fulfilled" ? ustdaEvents.value : []),
      ...(itaEvents.status === "fulfilled" ? itaEvents.value : []),
    ];

    eventsCache = { data: allEvents, ts: Date.now() };
  }

  let events = eventsCache.data;

  // Filter by country
  if (countries?.length) {
    const countryLower = countries.map((c) => c.toLowerCase());
    events = events.filter((e) => {
      const eventCountry = e.country.toLowerCase();
      const eventDesc = (e.description + " " + e.name).toLowerCase();
      return countryLower.some((c) => eventCountry.includes(c) || eventDesc.includes(c));
    });
  }

  // Filter by industry
  if (industries?.length) {
    const industryLower = industries.map((i) => i.toLowerCase());
    events = events.filter((e) => {
      const eventText = (e.name + " " + e.description + " " + e.industries.join(" ")).toLowerCase();
      return industryLower.some((i) => eventText.includes(i));
    });
  }

  // Sort by date (soonest first)
  events.sort((a, b) => {
    const da = new Date(a.startDate).getTime();
    const db = new Date(b.startDate).getTime();
    return (isNaN(da) ? Infinity : da) - (isNaN(db) ? Infinity : db);
  });

  return events.slice(0, maxResults);
}

/**
 * Well-known trade shows by industry (supplemental, curated data).
 * These are major recurring shows that may not appear in RSS feeds.
 */
export function getMajorTradeShows(industry: string, countries: string[]): TradeEvent[] {
  const shows: TradeEvent[] = [
    {
      id: "curated-hannover",
      name: "Hannover Messe 2026",
      description: "World's leading industrial technology trade fair. 5,000+ exhibitors from 60+ countries covering automation, energy, digital ecosystems, and industrial supply.",
      startDate: "2026-04-20",
      endDate: "2026-04-24",
      location: "Hannover, Germany",
      country: "Germany",
      industries: ["manufacturing", "industrial", "automation", "machinery", "energy"],
      url: "https://www.hannovermesse.de/en/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-canton",
      name: "Canton Fair (Phase 1) — Spring 2026",
      description: "China's largest trade fair, 25,000+ exhibitors. Phase 1 covers electronics, machinery, vehicles, building materials, lighting.",
      startDate: "2026-04-15",
      endDate: "2026-04-19",
      location: "Guangzhou, China",
      country: "China",
      industries: ["manufacturing", "electronics", "machinery", "industrial"],
      url: "https://www.cantonfair.org.cn/en/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-medica",
      name: "MEDICA 2026",
      description: "World's largest medical trade fair. 5,000+ exhibitors covering medical devices, health IT, laboratory equipment, diagnostics.",
      startDate: "2026-11-16",
      endDate: "2026-11-19",
      location: "Düsseldorf, Germany",
      country: "Germany",
      industries: ["medical", "healthcare", "medical devices", "diagnostics"],
      url: "https://www.medica-tradefair.com/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-ces",
      name: "CES 2027",
      description: "Consumer Electronics Show. 4,000+ exhibitors covering consumer tech, automotive tech, digital health, smart home.",
      startDate: "2027-01-05",
      endDate: "2027-01-08",
      location: "Las Vegas, USA",
      country: "United States",
      industries: ["electronics", "technology", "automotive", "consumer goods"],
      url: "https://www.ces.tech/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-expocomer",
      name: "EXPOCOMER 2026",
      description: "Central America's largest trade fair in Panama. Gateway to Latin American markets for US exporters.",
      startDate: "2026-03-18",
      endDate: "2026-03-21",
      location: "Panama City, Panama",
      country: "Panama",
      industries: ["general trade", "manufacturing", "consumer goods", "food"],
      url: "https://expocomer.com/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-agroalimentaria",
      name: "Alimentaria Mexico 2026",
      description: "Mexico's leading food and beverage trade show. 2,000+ exhibitors. Key entry point for US food exporters into Latin America.",
      startDate: "2026-06-02",
      endDate: "2026-06-04",
      location: "Mexico City, Mexico",
      country: "Mexico",
      industries: ["food", "beverage", "agriculture", "food processing"],
      url: "https://www.alimentaria-mexico.com/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-automechanika",
      name: "Automechanika Frankfurt 2026",
      description: "World's leading trade fair for the automotive aftermarket. 4,800+ exhibitors from 76 countries.",
      startDate: "2026-09-08",
      endDate: "2026-09-12",
      location: "Frankfurt, Germany",
      country: "Germany",
      industries: ["automotive", "automotive parts", "vehicles", "manufacturing"],
      url: "https://automechanika.messefrankfurt.com/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-jimtof",
      name: "JIMTOF 2026 — Japan International Machine Tool Fair",
      description: "One of the world's largest machine tool fairs. 900+ exhibitors covering CNC, metalworking, additive manufacturing, industrial robots.",
      startDate: "2026-11-05",
      endDate: "2026-11-10",
      location: "Tokyo, Japan",
      country: "Japan",
      industries: ["machinery", "machine tools", "manufacturing", "metalworking", "industrial"],
      url: "https://www.jimtof.org/en/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-fidae",
      name: "FIDAE 2026 — International Air & Space Fair",
      description: "Latin America's premier aerospace and defense exhibition. Held in Santiago, Chile.",
      startDate: "2026-04-07",
      endDate: "2026-04-12",
      location: "Santiago, Chile",
      country: "Chile",
      industries: ["aerospace", "defense", "aviation", "security"],
      url: "https://www.fidae.cl/en/",
      source: "Curated — Major International Trade Shows",
    },
    {
      id: "curated-arab-health",
      name: "Arab Health 2027",
      description: "Middle East's largest healthcare exhibition. 3,500+ exhibitors, gateway to Gulf markets.",
      startDate: "2027-01-27",
      endDate: "2027-01-30",
      location: "Dubai, UAE",
      country: "United Arab Emirates",
      industries: ["medical", "healthcare", "medical devices", "pharmaceuticals"],
      url: "https://www.arabhealthonline.com/",
      source: "Curated — Major International Trade Shows",
    },
  ];

  const industryLower = industry.toLowerCase();
  const countriesLower = countries.map((c) => c.toLowerCase());

  return shows.filter((s) => {
    const matchesIndustry = s.industries.some((i) => industryLower.includes(i) || i.includes(industryLower));
    const matchesCountry = countriesLower.some((c) =>
      s.country.toLowerCase().includes(c) || c.includes(s.country.toLowerCase()),
    );
    return matchesIndustry || matchesCountry;
  });
}

/**
 * Format trade events for report output.
 */
export function formatTradeEventsForReport(events: TradeEvent[]): string {
  if (events.length === 0) {
    return "No upcoming trade events found for your product/market combination.";
  }

  let text = `### Upcoming Trade Events\n\n`;

  for (const event of events) {
    const dateStr = event.endDate
      ? `${event.startDate} — ${event.endDate}`
      : event.startDate;

    text += `**${event.name}**\n`;
    text += `${dateStr} | ${event.location}\n`;
    text += `${event.description.slice(0, 200)}${event.description.length > 200 ? "..." : ""}\n`;
    if (event.registrationUrl) {
      text += `[Register](${event.registrationUrl}) | `;
    }
    text += `[Details](${event.url})\n`;
    text += `*Source: ${event.source}*\n\n`;
  }

  return text;
}

// ── Helpers ──

function extractCountries(text: string): string[] {
  const countries = [
    "Germany", "Japan", "China", "Mexico", "Brazil", "India", "United Kingdom",
    "France", "Italy", "South Korea", "Canada", "Australia", "Netherlands",
    "Saudi Arabia", "UAE", "Egypt", "Nigeria", "South Africa", "Kenya",
    "Turkey", "Poland", "Vietnam", "Thailand", "Philippines", "Indonesia",
    "Colombia", "Chile", "Argentina", "Peru", "Morocco", "Jordan",
    "Pakistan", "Bangladesh", "Taiwan", "Singapore", "Malaysia",
  ];

  return countries.filter((c) => text.toLowerCase().includes(c.toLowerCase()));
}

function extractIndustries(text: string): string[] {
  const keywords: Record<string, string> = {
    "energy": "Energy", "solar": "Energy", "renewable": "Energy",
    "healthcare": "Healthcare", "medical": "Healthcare", "health": "Healthcare",
    "agriculture": "Agriculture", "food": "Agriculture", "agri": "Agriculture",
    "manufacturing": "Manufacturing", "industrial": "Manufacturing",
    "technology": "Technology", "digital": "Technology", "ict": "Technology",
    "aerospace": "Aerospace & Defense", "defense": "Aerospace & Defense",
    "automotive": "Automotive", "vehicle": "Automotive",
    "infrastructure": "Infrastructure", "construction": "Infrastructure",
    "mining": "Mining", "mineral": "Mining",
  };

  const found = new Set<string>();
  const lower = text.toLowerCase();

  for (const [keyword, industry] of Object.entries(keywords)) {
    if (lower.includes(keyword)) found.add(industry);
  }

  return Array.from(found);
}
