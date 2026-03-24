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
 * Comprehensive curated trade show database across all major industries.
 * Returns ALL shows — filtering happens at the caller level.
 */
export function getMajorTradeShows(industry: string, countries: string[]): TradeEvent[] {
  const shows: TradeEvent[] = [
    // ── Manufacturing & Industrial ──
    { id: "curated-hannover", name: "Hannover Messe 2026", description: "World's leading industrial technology trade fair. 5,000+ exhibitors from 60+ countries covering automation, energy, digital ecosystems, and industrial supply.", startDate: "2026-04-20", endDate: "2026-04-24", location: "Hannover, Germany", country: "Germany", industries: ["manufacturing", "industrial", "automation", "machinery", "energy"], url: "https://www.hannovermesse.de/en/", source: "Curated — Major International Trade Shows" },
    { id: "curated-imts", name: "IMTS 2026 — International Manufacturing Technology Show", description: "Largest manufacturing trade show in North America. 2,500+ exhibitors covering CNC, 3D printing, tooling, automation, and advanced manufacturing.", startDate: "2026-09-14", endDate: "2026-09-19", location: "Chicago, USA", country: "United States", industries: ["manufacturing", "machinery", "machine tools", "industrial", "metalworking", "3d printing"], url: "https://www.imts.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-jimtof", name: "JIMTOF 2026 — Japan International Machine Tool Fair", description: "One of the world's largest machine tool fairs. 900+ exhibitors covering CNC, metalworking, additive manufacturing, industrial robots.", startDate: "2026-11-05", endDate: "2026-11-10", location: "Tokyo, Japan", country: "Japan", industries: ["machinery", "machine tools", "manufacturing", "metalworking", "industrial"], url: "https://www.jimtof.org/en/", source: "Curated — Major International Trade Shows" },
    { id: "curated-fabtech", name: "FABTECH 2026", description: "North America's largest metal forming, fabricating, welding, and finishing event. 1,500+ exhibitors.", startDate: "2026-10-19", endDate: "2026-10-22", location: "Las Vegas, USA", country: "United States", industries: ["manufacturing", "metalworking", "welding", "fabrication", "industrial"], url: "https://www.fabtechexpo.com/", source: "Curated — Major International Trade Shows" },

    // ── Sporting Goods & Outdoor ──
    { id: "curated-ispo", name: "ISPO 2026", description: "World's leading trade fair for sporting goods, outdoor, and winter sports. 50,000+ visitors. Moving to Amsterdam for 2026.", startDate: "2026-11-03", endDate: "2026-11-05", location: "Amsterdam, Netherlands", country: "Netherlands", industries: ["sports", "sporting goods", "outdoor", "fitness", "athletic", "baseball", "gloves", "apparel"], url: "https://www.ispo.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-outdoor-retailer", name: "Outdoor Retailer Summer 2026", description: "Premier outdoor industry trade show in North America. Gear, apparel, footwear, and accessories for hiking, camping, climbing, and team sports.", startDate: "2026-06-10", endDate: "2026-06-12", location: "Salt Lake City, USA", country: "United States", industries: ["outdoor", "sporting goods", "sports", "apparel", "footwear", "athletic", "fitness"], url: "https://www.outdoorretailer.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-the-sports-licensing", name: "Sports Licensing & Tailgate Show 2027", description: "Leading trade show for licensed sports products, team merchandise, tailgating gear, and fan accessories.", startDate: "2027-01-20", endDate: "2027-01-22", location: "Las Vegas, USA", country: "United States", industries: ["sports", "sporting goods", "baseball", "licensing", "merchandise", "apparel"], url: "https://www.sportslicensingshow.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-icast", name: "ICAST 2026 — International Convention of Allied Sportfishing Trades", description: "Premier sportfishing trade show. 600+ exhibitors showcasing rods, reels, tackle, marine electronics, and outdoor gear.", startDate: "2026-07-14", endDate: "2026-07-17", location: "Orlando, USA", country: "United States", industries: ["sports", "sporting goods", "outdoor", "fishing"], url: "https://www.icastfishing.org/", source: "Curated — Major International Trade Shows" },
    { id: "curated-shot-show", name: "SHOT Show 2027", description: "Shooting, Hunting, Outdoor Trade Show. 2,500+ exhibitors. Major platform for outdoor sports equipment, protective gear, and accessories.", startDate: "2027-01-20", endDate: "2027-01-23", location: "Las Vegas, USA", country: "United States", industries: ["outdoor", "sporting goods", "sports", "hunting", "protective gear"], url: "https://shotshow.org/", source: "Curated — Major International Trade Shows" },

    // ── Leather, Textiles & Apparel ──
    { id: "curated-lineapelle", name: "Lineapelle 2026 — International Leather Fair", description: "World's most important exhibition for leather, accessories, components, synthetics, and textiles. 1,200+ exhibitors.", startDate: "2026-09-22", endDate: "2026-09-24", location: "Milan, Italy", country: "Italy", industries: ["leather", "textiles", "apparel", "footwear", "accessories", "gloves", "handbags"], url: "https://www.lineapelle-fair.it/en", source: "Curated — Major International Trade Shows" },
    { id: "curated-heimtextil", name: "Heimtextil 2027", description: "International trade fair for home and contract textiles. Yarns, fibers, fabrics, leather, textile design, innovations.", startDate: "2027-01-13", endDate: "2027-01-16", location: "Frankfurt, Germany", country: "Germany", industries: ["textiles", "leather", "fabric", "apparel", "home textiles"], url: "https://heimtextil.messefrankfurt.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-techtextil", name: "Techtextil 2026 — International Trade Fair for Technical Textiles", description: "Leading fair for technical textiles and nonwovens. Performance fabrics, protective wear, smart textiles, medical textiles.", startDate: "2026-04-21", endDate: "2026-04-24", location: "Frankfurt, Germany", country: "Germany", industries: ["textiles", "apparel", "fabric", "technical textiles", "protective gear", "medical"], url: "https://techtextil.messefrankfurt.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-magic", name: "MAGIC Las Vegas 2026", description: "Largest fashion trade event in the US. Apparel, footwear, accessories, leather goods, and sourcing across 60+ countries.", startDate: "2026-08-18", endDate: "2026-08-20", location: "Las Vegas, USA", country: "United States", industries: ["apparel", "fashion", "footwear", "leather", "accessories", "textiles"], url: "https://www.magicfashionevents.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-texworld", name: "Texworld USA 2026", description: "Leading sourcing event for fabrics, trims, and textile products. Connects US brands with global textile suppliers.", startDate: "2026-07-21", endDate: "2026-07-23", location: "New York, USA", country: "United States", industries: ["textiles", "fabric", "apparel", "fashion", "leather"], url: "https://texworld-usa.us.messefrankfurt.com/", source: "Curated — Major International Trade Shows" },

    // ── General Trade & Multi-Sector ──
    { id: "curated-canton", name: "Canton Fair (Phase 1) — Spring 2026", description: "China's largest trade fair, 25,000+ exhibitors. Phase 1 covers electronics, machinery, vehicles, building materials, lighting.", startDate: "2026-04-15", endDate: "2026-04-19", location: "Guangzhou, China", country: "China", industries: ["manufacturing", "electronics", "machinery", "industrial", "consumer goods"], url: "https://www.cantonfair.org.cn/en/", source: "Curated — Major International Trade Shows" },
    { id: "curated-canton-p2", name: "Canton Fair (Phase 2) — Spring 2026", description: "Phase 2 covers consumer goods, gifts, home decorations, textiles, leather, sporting goods, and office supplies.", startDate: "2026-04-23", endDate: "2026-04-27", location: "Guangzhou, China", country: "China", industries: ["consumer goods", "textiles", "leather", "sporting goods", "gifts", "apparel", "gloves"], url: "https://www.cantonfair.org.cn/en/", source: "Curated — Major International Trade Shows" },
    { id: "curated-expocomer", name: "EXPOCOMER 2026", description: "Central America's largest trade fair in Panama. Gateway to Latin American markets for US exporters.", startDate: "2026-03-18", endDate: "2026-03-21", location: "Panama City, Panama", country: "Panama", industries: ["general trade", "manufacturing", "consumer goods", "food"], url: "https://expocomer.com/", source: "Curated — Major International Trade Shows" },

    // ── Automotive ──
    { id: "curated-automechanika", name: "Automechanika Frankfurt 2026", description: "World's leading trade fair for the automotive aftermarket. 4,800+ exhibitors from 76 countries.", startDate: "2026-09-08", endDate: "2026-09-12", location: "Frankfurt, Germany", country: "Germany", industries: ["automotive", "automotive parts", "vehicles", "manufacturing"], url: "https://automechanika.messefrankfurt.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-sema", name: "SEMA Show 2026", description: "Premier automotive specialty products trade event. 2,500+ exhibitors showcasing aftermarket parts, accessories, and tools.", startDate: "2026-11-03", endDate: "2026-11-06", location: "Las Vegas, USA", country: "United States", industries: ["automotive", "automotive parts", "vehicles", "accessories"], url: "https://www.semashow.com/", source: "Curated — Major International Trade Shows" },

    // ── Medical & Healthcare ──
    { id: "curated-medica", name: "MEDICA 2026", description: "World's largest medical trade fair. 5,000+ exhibitors covering medical devices, health IT, laboratory equipment, diagnostics.", startDate: "2026-11-16", endDate: "2026-11-19", location: "Düsseldorf, Germany", country: "Germany", industries: ["medical", "healthcare", "medical devices", "diagnostics"], url: "https://www.medica-tradefair.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-arab-health", name: "Arab Health 2027", description: "Middle East's largest healthcare exhibition. 3,500+ exhibitors, gateway to Gulf markets.", startDate: "2027-01-27", endDate: "2027-01-30", location: "Dubai, UAE", country: "United Arab Emirates", industries: ["medical", "healthcare", "medical devices", "pharmaceuticals"], url: "https://www.arabhealthonline.com/", source: "Curated — Major International Trade Shows" },

    // ── Food & Agriculture ──
    { id: "curated-alimentaria", name: "Alimentaria Mexico 2026", description: "Mexico's leading food and beverage trade show. 2,000+ exhibitors. Key entry point for US food exporters into Latin America.", startDate: "2026-06-02", endDate: "2026-06-04", location: "Mexico City, Mexico", country: "Mexico", industries: ["food", "beverage", "agriculture", "food processing"], url: "https://www.alimentaria-mexico.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-anuga", name: "Anuga 2027 — World's Leading Food Fair", description: "Largest food and beverage trade fair globally. 7,500+ exhibitors from 100+ countries. Held every two years in Cologne.", startDate: "2027-10-09", endDate: "2027-10-13", location: "Cologne, Germany", country: "Germany", industries: ["food", "beverage", "agriculture", "food processing", "consumer goods"], url: "https://www.anuga.com/", source: "Curated — Major International Trade Shows" },
    { id: "curated-tuttofood", name: "TUTTOFOOD 2026", description: "Italy's leading international B2B food exhibition. Major agri-food sector event.", startDate: "2026-05-05", endDate: "2026-05-08", location: "Milan, Italy", country: "Italy", industries: ["food", "beverage", "agriculture", "food processing"], url: "https://www.tuttofood.it/en", source: "Curated — Major International Trade Shows" },
    { id: "curated-green-week", name: "International Green Week 2027", description: "World's largest fair for food, agriculture, and horticulture. Berlin's iconic exhibition.", startDate: "2027-01-15", endDate: "2027-01-24", location: "Berlin, Germany", country: "Germany", industries: ["food", "agriculture", "horticulture", "beverage"], url: "https://www.gruenewoche.de/en/", source: "Curated — Major International Trade Shows" },

    // ── Electronics & Technology ──
    { id: "curated-ces", name: "CES 2027", description: "Consumer Electronics Show. 4,000+ exhibitors covering consumer tech, automotive tech, digital health, smart home.", startDate: "2027-01-05", endDate: "2027-01-08", location: "Las Vegas, USA", country: "United States", industries: ["electronics", "technology", "automotive", "consumer goods"], url: "https://www.ces.tech/", source: "Curated — Major International Trade Shows" },
    { id: "curated-computex", name: "COMPUTEX Taipei 2026", description: "Asia's largest ICT trade show. AI, IoT, 5G, edge computing, gaming, and startups.", startDate: "2026-06-02", endDate: "2026-06-05", location: "Taipei, Taiwan", country: "Taiwan", industries: ["electronics", "technology", "computing", "semiconductor"], url: "https://www.computextaipei.com.tw/", source: "Curated — Major International Trade Shows" },

    // ── Aerospace & Defense ──
    { id: "curated-fidae", name: "FIDAE 2026 — International Air & Space Fair", description: "Latin America's premier aerospace and defense exhibition.", startDate: "2026-04-07", endDate: "2026-04-12", location: "Santiago, Chile", country: "Chile", industries: ["aerospace", "defense", "aviation", "security"], url: "https://www.fidae.cl/en/", source: "Curated — Major International Trade Shows" },
    { id: "curated-paris-air", name: "Paris Air Show 2027", description: "World's largest aerospace event. 2,500+ exhibitors covering commercial aviation, defense, space, and emerging technologies.", startDate: "2027-06-16", endDate: "2027-06-22", location: "Paris, France", country: "France", industries: ["aerospace", "defense", "aviation", "space"], url: "https://www.siae.fr/en/", source: "Curated — Major International Trade Shows" },

    // ── Footwear ──
    { id: "curated-micam", name: "MICAM Milano 2026 — International Footwear Exhibition", description: "World's leading footwear trade fair. 1,200+ exhibitors showcasing shoes, boots, sneakers, leather footwear, and accessories.", startDate: "2026-09-20", endDate: "2026-09-22", location: "Milan, Italy", country: "Italy", industries: ["footwear", "shoes", "leather", "boots", "fashion", "apparel"], url: "https://www.themicam.com/en", source: "Curated — Major International Trade Shows" },

    // ── Fitness & Exercise ──
    { id: "curated-fibo", name: "FIBO 2026 — International Fitness Trade Show", description: "World's largest fitness trade fair. Equipment, nutrition, digital fitness, wellness, and training solutions.", startDate: "2026-04-09", endDate: "2026-04-11", location: "Cologne, Germany", country: "Germany", industries: ["fitness", "exercise", "sports", "wellness", "health", "equipment", "sporting goods"], url: "https://www.fibo.com/en/", source: "Curated — Major International Trade Shows" },

    // ── Construction & Infrastructure ──
    { id: "curated-bauma", name: "bauma 2027 — World's Leading Construction Trade Fair", description: "World's largest trade fair for construction, mining, and building materials. 3,500+ exhibitors.", startDate: "2027-04-19", endDate: "2027-04-25", location: "Munich, Germany", country: "Germany", industries: ["construction", "infrastructure", "mining", "building materials", "machinery"], url: "https://bauma.de/en/", source: "Curated — Major International Trade Shows" },

    // ── Energy ──
    { id: "curated-intersolar", name: "Intersolar North America 2026", description: "Premier solar industry trade show. Solar technology, energy storage, electric infrastructure.", startDate: "2026-02-25", endDate: "2026-02-27", location: "San Diego, USA", country: "United States", industries: ["energy", "solar", "renewable", "electrical"], url: "https://www.intersolar.us/", source: "Curated — Major International Trade Shows" },
  ];

  // Return all shows with loose matching — let the caller filter/rank further
  const industryLower = industry.toLowerCase();
  const countriesLower = countries.map((c) => c.toLowerCase());

  // Score each show by relevance
  const scored = shows.map((s) => {
    let score = 0;
    // Industry match
    if (s.industries.some((i) => industryLower.includes(i) || i.includes(industryLower))) score += 2;
    // Partial industry keyword match
    const industryWords = industryLower.split(/\s+/);
    if (s.industries.some((i) => industryWords.some((w) => w.length > 3 && i.includes(w)))) score += 1;
    // Country match
    if (countriesLower.some((c) => s.country.toLowerCase().includes(c) || c.includes(s.country.toLowerCase()))) score += 1;
    // General trade shows always get a base score
    if (s.industries.includes("general trade") || s.industries.includes("consumer goods")) score += 0.5;
    return { show: s, score };
  });

  // Return shows sorted by relevance, include anything with score > 0,
  // plus always include top general shows
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.show);
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
