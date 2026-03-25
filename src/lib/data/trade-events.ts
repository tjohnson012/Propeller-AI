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
 * Comprehensive curated trade show database — 90+ real shows across all major industries.
 * Sources: TheTradeShowNetwork.com, EventsInAmerica, FoodIndustryExecutive, USDA FAS.
 * Returns shows scored by relevance to the user's product and target markets.
 */
export function getMajorTradeShows(industry: string, countries: string[]): TradeEvent[] {
  const src = "Curated — Trade Show Calendar";
  const shows: TradeEvent[] = [
    // ═══════════════════════════════════════════════
    // MANUFACTURING & INDUSTRIAL
    // ═══════════════════════════════════════════════
    { id: "c-imts", name: "IMTS 2026 — International Manufacturing Technology Show", description: "Largest manufacturing trade show in the Western Hemisphere. 100,000+ attendees, 1,800+ exhibitors covering CNC, 3D printing, tooling, automation, robotics, and digital manufacturing.", startDate: "2026-09-14", endDate: "2026-09-19", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["manufacturing", "machinery", "machine tools", "industrial", "metalworking", "3d printing", "automation", "robotics"], url: "https://www.imts.com/", source: src },
    { id: "c-fabtech", name: "FABTECH 2026", description: "North America's largest metal forming, fabricating, welding, and finishing event. 1,500+ exhibitors covering cutting, bending, stamping, and finishing.", startDate: "2026-10-19", endDate: "2026-10-22", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["manufacturing", "metalworking", "welding", "fabrication", "industrial", "steel", "metal"], url: "https://www.fabtechexpo.com/", source: src },
    { id: "c-automate", name: "Automate 2026", description: "Premier robotics and automation trade show. 50,000+ visitors, 1,000+ exhibitors showcasing industrial robots, AI, vision systems, and motion control.", startDate: "2026-06-22", endDate: "2026-06-25", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["automation", "robotics", "manufacturing", "industrial", "technology", "machinery"], url: "https://www.automateshow.com/", source: src },
    { id: "c-hannover", name: "Hannover Messe 2026", description: "World's leading industrial technology trade fair. 5,000+ exhibitors from 60+ countries covering automation, energy, digital ecosystems, and industrial supply.", startDate: "2026-04-20", endDate: "2026-04-24", location: "Hannover, Germany", country: "Germany", industries: ["manufacturing", "industrial", "automation", "machinery", "energy", "electrical"], url: "https://www.hannovermesse.de/en/", source: src },
    { id: "c-jimtof", name: "JIMTOF 2026 — Japan International Machine Tool Fair", description: "One of the world's largest machine tool fairs. 900+ exhibitors covering CNC, metalworking, additive manufacturing, industrial robots.", startDate: "2026-11-05", endDate: "2026-11-10", location: "Tokyo Big Sight, Japan", country: "Japan", industries: ["machinery", "machine tools", "manufacturing", "metalworking", "industrial"], url: "https://www.jimtof.org/en/", source: src },
    { id: "c-mdm", name: "MD&M West 2026 — Medical Design & Manufacturing", description: "Leading medtech manufacturing event. 8,000+ exhibitors covering medical device design, plastics, automation, and contract manufacturing.", startDate: "2026-02-03", endDate: "2026-02-05", location: "Anaheim Convention Center, CA", country: "United States", industries: ["medical devices", "manufacturing", "medical", "healthcare", "plastics", "automation"], url: "https://www.mdmwest.com/", source: src },
    { id: "c-dmems", name: "DMEMS 2026 — Defense Manufacturing & Engineering", description: "Connects defense manufacturing leaders, engineers, and suppliers focused on production readiness and advanced materials.", startDate: "2026-04-22", endDate: "2026-04-23", location: "San Diego, CA", country: "United States", industries: ["defense", "manufacturing", "aerospace", "engineering", "metal", "advanced materials"], url: "https://www.dmems.com/", source: src },
    { id: "c-labelexpo", name: "Labelexpo Americas 2026", description: "Leading label and package printing trade show. 450+ exhibitors, 12,000+ visitors from 70+ countries covering presses, inks, RFID, and finishing.", startDate: "2026-09-15", endDate: "2026-09-17", location: "Donald E. Stephens Convention Center, IL", country: "United States", industries: ["packaging", "printing", "labels", "manufacturing", "consumer goods"], url: "https://www.labelexpo-americas.com/", source: src },
    { id: "c-automation-fair", name: "Automation Fair 2026", description: "Rockwell Automation's flagship event. 10,000+ attendees exploring industrial automation, IoT, digital transformation, and smart manufacturing.", startDate: "2026-11-16", endDate: "2026-11-19", location: "Boston, MA", country: "United States", industries: ["automation", "manufacturing", "industrial", "technology", "electrical", "controls"], url: "https://www.rockwellautomation.com/en-us/company/events/in-person-events/automation-fair.html", source: src },

    // ═══════════════════════════════════════════════
    // FOOD & BEVERAGE
    // ═══════════════════════════════════════════════
    { id: "c-nra-show", name: "National Restaurant Association Show 2026", description: "World's most influential foodservice showcase. 60,000+ attendees exploring menu innovation, equipment, sustainable packaging, and AI-driven service.", startDate: "2026-05-16", endDate: "2026-05-19", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["food", "beverage", "restaurant", "hospitality", "food processing", "food service"], url: "https://www.nationalrestaurantshow.com/", source: src },
    { id: "c-sweets-snacks", name: "Sweets & Snacks Expo 2026", description: "North America's leading confectionery and snack trade show. Premier destination for retail buyers in candy, snacks, and sweet baked goods.", startDate: "2026-05-19", endDate: "2026-05-21", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["food", "snacks", "confectionery", "beverage", "consumer goods", "retail"], url: "https://sweetsandsnacks.com/", source: src },
    { id: "c-bar-restaurant", name: "Bar & Restaurant Expo 2026", description: "11,000+ F&B professionals come together covering beverage trends, bar equipment, spirits, and hospitality innovation.", startDate: "2026-03-23", endDate: "2026-03-25", location: "Las Vegas, NV", country: "United States", industries: ["food", "beverage", "restaurant", "hospitality", "spirits"], url: "https://www.barrestaurantexpo.com/", source: src },
    { id: "c-ift-first", name: "IFT FIRST 2026 — Annual Food Expo", description: "Global food science event connecting R&D leaders, ingredient suppliers, and food technology innovators across every food sector.", startDate: "2026-07-12", endDate: "2026-07-15", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["food", "food science", "food processing", "ingredients", "beverage", "agriculture"], url: "https://www.iftevent.org/", source: src },
    { id: "c-fancy-food", name: "Summer Fancy Food Show 2026", description: "Specialty food industry's premier product discovery event. Artisan, organic, and gourmet food and beverage sourcing.", startDate: "2026-06-28", endDate: "2026-06-30", location: "Javits Center, New York, NY", country: "United States", industries: ["food", "specialty food", "beverage", "gourmet", "organic", "consumer goods"], url: "https://www.specialtyfood.com/", source: src },
    { id: "c-iddba", name: "IDDBA Show 2026", description: "Premier event for dairy, deli, bakery, and specialty food professionals connecting with retail buyers.", startDate: "2026-06-07", endDate: "2026-06-09", location: "Orlando, FL", country: "United States", industries: ["food", "dairy", "bakery", "deli", "specialty food", "retail"], url: "https://www.iddba.org/", source: src },
    { id: "c-supplyside", name: "SupplySide Global 2026", description: "Leading ingredients and supply chain sourcing event for dietary supplements, food, and beverage manufacturers.", startDate: "2026-10-26", endDate: "2026-10-30", location: "Las Vegas, NV", country: "United States", industries: ["food", "supplements", "ingredients", "beverage", "health", "nutrition"], url: "https://west.supplysideshow.com/", source: src },
    { id: "c-food-mfg-summit", name: "American Food Manufacturing Summit 2026", description: "Executive-level conference for food manufacturing leaders. 200+ industry executives covering operations, safety, and innovation.", startDate: "2026-11-02", endDate: "2026-11-03", location: "Chicago, IL", country: "United States", industries: ["food", "food processing", "manufacturing", "food safety", "agriculture"], url: "https://www.foodmanufacturingsummit.com/", source: src },
    { id: "c-transform-food", name: "Transform Food & Agriculture USA 2026", description: "Unites 200+ agriculture and food industry leaders to gain insights and forge partnerships on future of food.", startDate: "2026-10-27", endDate: "2026-10-28", location: "Minneapolis, MN", country: "United States", industries: ["food", "agriculture", "farming", "agtech", "food processing"], url: "https://transformfood.com/", source: src },
    { id: "c-snx", name: "SNX 2026 — SNAC International Conference", description: "SNAC International's education and collaboration forum for snack industry innovation and growth.", startDate: "2026-03-29", endDate: "2026-03-31", location: "Dallas, TX", country: "United States", industries: ["food", "snacks", "consumer goods", "manufacturing", "retail"], url: "https://www.snacintl.org/", source: src },
    { id: "c-petfood", name: "Petfood Forum 2026", description: "Only event 100% dedicated to pet food manufacturing. Covers formulation, processing, packaging, and ingredients.", startDate: "2026-04-27", endDate: "2026-04-29", location: "Kansas City, MO", country: "United States", industries: ["pet food", "food processing", "animal", "manufacturing", "ingredients"], url: "https://www.petfoodforumevents.com/", source: src },
    { id: "c-alimentaria", name: "Alimentaria Mexico 2026", description: "Mexico's leading food and beverage trade show. 2,000+ exhibitors. Key entry point for US food exporters into Latin America.", startDate: "2026-06-02", endDate: "2026-06-04", location: "Mexico City, Mexico", country: "Mexico", industries: ["food", "beverage", "agriculture", "food processing"], url: "https://www.alimentaria-mexico.com/", source: src },
    { id: "c-anuga", name: "Anuga 2027 — World's Leading Food Fair", description: "Largest food and beverage trade fair globally. 7,500+ exhibitors from 100+ countries.", startDate: "2027-10-09", endDate: "2027-10-13", location: "Cologne, Germany", country: "Germany", industries: ["food", "beverage", "agriculture", "food processing", "consumer goods"], url: "https://www.anuga.com/", source: src },
    { id: "c-tuttofood", name: "TUTTOFOOD 2026", description: "Italy's leading international B2B food exhibition. Major agri-food sector event with global buyers.", startDate: "2026-05-05", endDate: "2026-05-08", location: "Milan, Italy", country: "Italy", industries: ["food", "beverage", "agriculture", "food processing"], url: "https://www.tuttofood.it/en", source: src },
    { id: "c-green-week", name: "International Green Week 2027", description: "World's largest fair for food, agriculture, and horticulture. Berlin's iconic exhibition.", startDate: "2027-01-15", endDate: "2027-01-24", location: "Berlin, Germany", country: "Germany", industries: ["food", "agriculture", "horticulture", "beverage"], url: "https://www.gruenewoche.de/en/", source: src },

    // ═══════════════════════════════════════════════
    // PACKAGING & PROCESSING
    // ═══════════════════════════════════════════════
    { id: "c-pack-expo-e", name: "PACK EXPO East 2026", description: "Key regional packaging trade show. 500+ exhibitors, 8,000+ attendees covering automation, machinery, sustainable materials, and smart manufacturing.", startDate: "2026-03-17", endDate: "2026-03-19", location: "Pennsylvania Convention Center, Philadelphia, PA", country: "United States", industries: ["packaging", "food processing", "manufacturing", "machinery", "consumer goods", "plastics"], url: "https://www.packexpoeast.com/", source: src },
    { id: "c-pack-expo", name: "PACK EXPO International 2026", description: "Global packaging event. 48,000+ buyers, 2,600+ exhibitors presenting packaging machinery, materials, and processing equipment across 40+ industries.", startDate: "2026-10-18", endDate: "2026-10-21", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["packaging", "food processing", "manufacturing", "machinery", "consumer goods", "plastics", "beverage"], url: "https://www.packexpointernational.com/", source: src },
    { id: "c-interpack", name: "interpack 2026", description: "World's leading packaging trade fair. 2,865 exhibitors, 170,500 visitors covering packaging machinery, materials, and food processing.", startDate: "2026-05-07", endDate: "2026-05-13", location: "Düsseldorf, Germany", country: "Germany", industries: ["packaging", "food processing", "manufacturing", "machinery", "plastics"], url: "https://www.interpack.com/", source: src },

    // ═══════════════════════════════════════════════
    // SPORTING GOODS & OUTDOOR
    // ═══════════════════════════════════════════════
    { id: "c-ispo", name: "ISPO 2026", description: "World's leading trade fair for sporting goods, outdoor, and winter sports. 50,000+ visitors from 120+ countries.", startDate: "2026-11-03", endDate: "2026-11-05", location: "Amsterdam, Netherlands", country: "Netherlands", industries: ["sports", "sporting goods", "outdoor", "fitness", "athletic", "baseball", "gloves", "apparel", "footwear"], url: "https://www.ispo.com/", source: src },
    { id: "c-outdoor-retailer", name: "Outdoor Retailer Summer 2026", description: "Premier outdoor industry trade show in North America. Gear, apparel, footwear, and accessories for hiking, camping, climbing, and team sports.", startDate: "2026-06-10", endDate: "2026-06-12", location: "Salt Lake City, UT", country: "United States", industries: ["outdoor", "sporting goods", "sports", "apparel", "footwear", "athletic", "fitness"], url: "https://www.outdoorretailer.com/", source: src },
    { id: "c-sports-licensing", name: "Sports Licensing & Tailgate Show 2027", description: "Leading trade show for licensed sports products, team merchandise, tailgating gear, and fan accessories.", startDate: "2027-01-20", endDate: "2027-01-22", location: "Las Vegas, NV", country: "United States", industries: ["sports", "sporting goods", "baseball", "licensing", "merchandise", "apparel"], url: "https://www.sportslicensingshow.com/", source: src },
    { id: "c-icast", name: "ICAST 2026 — Sportfishing Trade Show", description: "Premier sportfishing trade show. 600+ exhibitors showcasing rods, reels, tackle, marine electronics, and outdoor gear.", startDate: "2026-07-14", endDate: "2026-07-17", location: "Orlando, FL", country: "United States", industries: ["sports", "sporting goods", "outdoor", "fishing", "marine"], url: "https://www.icastfishing.org/", source: src },
    { id: "c-shot-show", name: "SHOT Show 2027", description: "Shooting, Hunting, Outdoor Trade Show. 2,500+ exhibitors. Major platform for outdoor sports equipment, protective gear, and accessories.", startDate: "2027-01-20", endDate: "2027-01-23", location: "Las Vegas, NV", country: "United States", industries: ["outdoor", "sporting goods", "sports", "hunting", "protective gear", "firearms"], url: "https://shotshow.org/", source: src },
    { id: "c-fibo", name: "FIBO 2026 — International Fitness Trade Show", description: "World's largest fitness trade fair. Equipment, nutrition, digital fitness, wellness, and training solutions.", startDate: "2026-04-09", endDate: "2026-04-11", location: "Cologne, Germany", country: "Germany", industries: ["fitness", "exercise", "sports", "wellness", "health", "equipment", "sporting goods"], url: "https://www.fibo.com/en/", source: src },

    // ═══════════════════════════════════════════════
    // LEATHER, TEXTILES & APPAREL
    // ═══════════════════════════════════════════════
    { id: "c-lineapelle", name: "Lineapelle 2026 — International Leather Fair", description: "World's most important exhibition for leather, accessories, components, synthetics, and textiles. 1,200+ exhibitors.", startDate: "2026-09-22", endDate: "2026-09-24", location: "Milan, Italy", country: "Italy", industries: ["leather", "textiles", "apparel", "footwear", "accessories", "gloves", "handbags"], url: "https://www.lineapelle-fair.it/en", source: src },
    { id: "c-magic", name: "MAGIC Las Vegas 2026", description: "Largest fashion marketplace in the US. 20,000+ visitors, 5,000+ exhibitors. Apparel, footwear, accessories, leather goods, and sourcing.", startDate: "2026-08-18", endDate: "2026-08-20", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["apparel", "fashion", "footwear", "leather", "accessories", "textiles", "consumer goods"], url: "https://www.magicfashionevents.com/", source: src },
    { id: "c-texworld", name: "Texworld USA 2026", description: "Leading sourcing event for fabrics, trims, and textile products. Connects US brands with global textile suppliers.", startDate: "2026-07-21", endDate: "2026-07-23", location: "Javits Center, New York, NY", country: "United States", industries: ["textiles", "fabric", "apparel", "fashion", "leather"], url: "https://texworld-usa.us.messefrankfurt.com/", source: src },
    { id: "c-heimtextil", name: "Heimtextil 2027", description: "International trade fair for home and contract textiles. Yarns, fibers, fabrics, leather, textile design.", startDate: "2027-01-13", endDate: "2027-01-16", location: "Frankfurt, Germany", country: "Germany", industries: ["textiles", "leather", "fabric", "apparel", "home textiles", "furniture"], url: "https://heimtextil.messefrankfurt.com/", source: src },
    { id: "c-techtextil", name: "Techtextil 2026 — Technical Textiles Fair", description: "Leading fair for technical textiles and nonwovens. Performance fabrics, protective wear, smart textiles.", startDate: "2026-04-21", endDate: "2026-04-24", location: "Frankfurt, Germany", country: "Germany", industries: ["textiles", "apparel", "fabric", "technical textiles", "protective gear", "medical"], url: "https://techtextil.messefrankfurt.com/", source: src },
    { id: "c-micam", name: "MICAM Milano 2026 — International Footwear Exhibition", description: "World's leading footwear trade fair. 1,200+ exhibitors showcasing shoes, boots, sneakers, leather footwear, and accessories.", startDate: "2026-09-20", endDate: "2026-09-22", location: "Milan, Italy", country: "Italy", industries: ["footwear", "shoes", "leather", "boots", "fashion", "apparel"], url: "https://www.themicam.com/en", source: src },

    // ═══════════════════════════════════════════════
    // AUTOMOTIVE
    // ═══════════════════════════════════════════════
    { id: "c-sema", name: "SEMA Show 2026", description: "Premier automotive specialty products trade event. 132,000+ visitors, 2,500+ exhibitors showcasing aftermarket parts, accessories, and tools.", startDate: "2026-11-03", endDate: "2026-11-06", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["automotive", "automotive parts", "vehicles", "accessories", "manufacturing"], url: "https://www.semashow.com/", source: src },
    { id: "c-aapex", name: "AAPEX 2026 — Automotive Aftermarket Products", description: "Meeting place for the entire automotive aftermarket. Parts, accessories, tools, and technology.", startDate: "2026-11-03", endDate: "2026-11-05", location: "The Venetian Expo, Las Vegas, NV", country: "United States", industries: ["automotive", "automotive parts", "vehicles", "manufacturing", "technology"], url: "https://www.aapexshow.com/", source: src },
    { id: "c-automechanika", name: "Automechanika Frankfurt 2026", description: "World's leading trade fair for the automotive aftermarket. 4,800+ exhibitors from 76 countries.", startDate: "2026-09-08", endDate: "2026-09-12", location: "Frankfurt, Germany", country: "Germany", industries: ["automotive", "automotive parts", "vehicles", "manufacturing"], url: "https://automechanika.messefrankfurt.com/", source: src },

    // ═══════════════════════════════════════════════
    // MEDICAL & HEALTHCARE
    // ═══════════════════════════════════════════════
    { id: "c-himss", name: "HIMSS 2026 — Global Health Conference", description: "One of the largest healthcare technology conferences. 30,000+ attendees, 1,000+ exhibitors covering AI, cybersecurity, digital health, and interoperability.", startDate: "2026-03-03", endDate: "2026-03-06", location: "The Venetian Expo, Las Vegas, NV", country: "United States", industries: ["healthcare", "medical", "health technology", "medical devices", "digital health"], url: "https://www.himss.org/", source: src },
    { id: "c-medica", name: "MEDICA 2026", description: "World's largest medical trade fair. 5,000+ exhibitors covering medical devices, health IT, laboratory equipment, diagnostics.", startDate: "2026-11-16", endDate: "2026-11-19", location: "Düsseldorf, Germany", country: "Germany", industries: ["medical", "healthcare", "medical devices", "diagnostics", "laboratory"], url: "https://www.medica-tradefair.com/", source: src },
    { id: "c-arab-health", name: "Arab Health 2027", description: "Middle East's largest healthcare exhibition. 3,500+ exhibitors, gateway to Gulf markets.", startDate: "2027-01-27", endDate: "2027-01-30", location: "Dubai, UAE", country: "United Arab Emirates", industries: ["medical", "healthcare", "medical devices", "pharmaceuticals"], url: "https://www.arabhealthonline.com/", source: src },
    { id: "c-rsna", name: "RSNA 2026 — Radiology Conference", description: "Leading radiology and medical imaging event. CT, MRI, AI, 3D printing, and imaging technology for healthcare professionals.", startDate: "2026-11-29", endDate: "2026-12-03", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["medical", "healthcare", "medical devices", "imaging", "diagnostics", "technology"], url: "https://www.rsna.org/", source: src },
    { id: "c-cphi", name: "CPHI North America 2026", description: "Connects pharmaceutical manufacturers, CDMOs, ingredient suppliers, and regulatory service providers.", startDate: "2026-06-02", endDate: "2026-06-04", location: "Philadelphia, PA", country: "United States", industries: ["pharmaceutical", "medical", "healthcare", "chemicals", "manufacturing"], url: "https://www.cphi.com/north-america/", source: src },

    // ═══════════════════════════════════════════════
    // ELECTRONICS & TECHNOLOGY
    // ═══════════════════════════════════════════════
    { id: "c-ces", name: "CES 2027", description: "Consumer Electronics Show. 112,000+ attendees, 4,500+ exhibitors covering consumer tech, automotive tech, digital health, smart home.", startDate: "2027-01-05", endDate: "2027-01-08", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["electronics", "technology", "automotive", "consumer goods", "semiconductor", "smart home"], url: "https://www.ces.tech/", source: src },
    { id: "c-nab", name: "NAB Show 2026", description: "National Association of Broadcasters show. 92,000+ visitors, 1,700+ exhibitors covering cameras, lighting, transmission, and media technology.", startDate: "2026-04-18", endDate: "2026-04-22", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["broadcasting", "media", "technology", "electronics", "video", "audio"], url: "https://www.nabshow.com/", source: src },
    { id: "c-infocomm", name: "InfoComm 2026", description: "Leading North American event for professional AV and integrated experience technologies. 29,000+ visitors.", startDate: "2026-06-17", endDate: "2026-06-19", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["technology", "av", "electronics", "audio", "video", "displays"], url: "https://www.infocommshow.org/", source: src },
    { id: "c-computex", name: "COMPUTEX Taipei 2026", description: "Asia's largest ICT trade show. AI, IoT, 5G, edge computing, gaming, and startups.", startDate: "2026-06-02", endDate: "2026-06-05", location: "Taipei, Taiwan", country: "Taiwan", industries: ["electronics", "technology", "computing", "semiconductor", "ai"], url: "https://www.computextaipei.com.tw/", source: src },
    { id: "c-blackhat", name: "Black Hat USA 2026", description: "Most prestigious information security event. Cutting-edge research, training, and technology for cybersecurity professionals.", startDate: "2026-08-01", endDate: "2026-08-06", location: "Mandalay Bay, Las Vegas, NV", country: "United States", industries: ["cybersecurity", "technology", "software", "electronics"], url: "https://www.blackhat.com/", source: src },

    // ═══════════════════════════════════════════════
    // CONSTRUCTION & BUILDING MATERIALS
    // ═══════════════════════════════════════════════
    { id: "c-woc", name: "World of Concrete 2026", description: "International event for concrete and masonry professionals. 1,500+ companies, 700,000 sq ft floor space.", startDate: "2026-01-20", endDate: "2026-01-22", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["construction", "concrete", "masonry", "building materials", "infrastructure"], url: "https://www.worldofconcrete.com/", source: src },
    { id: "c-bauma", name: "bauma 2027 — World's Leading Construction Trade Fair", description: "World's largest trade fair for construction, mining, and building materials. 3,500+ exhibitors.", startDate: "2027-04-19", endDate: "2027-04-25", location: "Munich, Germany", country: "Germany", industries: ["construction", "infrastructure", "mining", "building materials", "machinery", "heavy equipment"], url: "https://bauma.de/en/", source: src },

    // ═══════════════════════════════════════════════
    // ENERGY & ENVIRONMENT
    // ═══════════════════════════════════════════════
    { id: "c-intersolar", name: "Intersolar North America 2026", description: "Premier solar industry trade show. Solar technology, energy storage, electric infrastructure.", startDate: "2026-02-25", endDate: "2026-02-27", location: "San Diego Convention Center, CA", country: "United States", industries: ["energy", "solar", "renewable", "electrical", "power"], url: "https://www.intersolar.us/", source: src },
    { id: "c-otc", name: "Offshore Technology Conference 2026", description: "World's leading conference for offshore resources. 100+ speakers, 50+ year history covering oil, gas, and energy technology.", startDate: "2026-05-04", endDate: "2026-05-07", location: "NRG Park, Houston, TX", country: "United States", industries: ["energy", "oil", "gas", "offshore", "engineering", "industrial"], url: "https://www.otcnet.org/", source: src },
    { id: "c-ieee-pes", name: "IEEE PES T&D 2026", description: "Power and energy transmission and distribution. 800+ exhibitors, 15,000+ visitors from 60+ countries.", startDate: "2026-05-04", endDate: "2026-05-07", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["energy", "electrical", "power", "infrastructure", "technology"], url: "https://www.ieeet-d.org/", source: src },

    // ═══════════════════════════════════════════════
    // AEROSPACE & DEFENSE
    // ═══════════════════════════════════════════════
    { id: "c-fidae", name: "FIDAE 2026 — International Air & Space Fair", description: "Latin America's premier aerospace and defense exhibition.", startDate: "2026-04-07", endDate: "2026-04-12", location: "Santiago, Chile", country: "Chile", industries: ["aerospace", "defense", "aviation", "security", "military"], url: "https://www.fidae.cl/en/", source: src },
    { id: "c-paris-air", name: "Paris Air Show 2027", description: "World's largest aerospace event. 2,500+ exhibitors covering commercial aviation, defense, space, and emerging technologies.", startDate: "2027-06-16", endDate: "2027-06-22", location: "Le Bourget, Paris, France", country: "France", industries: ["aerospace", "defense", "aviation", "space"], url: "https://www.siae.fr/en/", source: src },

    // ═══════════════════════════════════════════════
    // CONSUMER GOODS & RETAIL
    // ═══════════════════════════════════════════════
    { id: "c-asd", name: "ASD Market Week 2026", description: "World's top B2B wholesale trade show. 45,000+ buyers, 2,700+ exhibitors covering consumer merchandise across all categories.", startDate: "2026-03-08", endDate: "2026-03-11", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["consumer goods", "retail", "wholesale", "general trade", "gifts", "housewares"], url: "https://www.asdonline.com/", source: src },
    { id: "c-inspired-home", name: "The Inspired Home Show 2026", description: "North America's largest housewares trade show. Professionals from 120+ countries exploring kitchen, home, and personal care products.", startDate: "2026-03-10", endDate: "2026-03-12", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["housewares", "home", "kitchen", "consumer goods", "retail", "furniture"], url: "https://www.theinspiredhomeshow.com/", source: src },
    { id: "c-nhs", name: "National Hardware Show 2026", description: "20,000+ attendees, 2,800+ exhibitors offering buying opportunities in tools, hardware, lawn & garden, and home improvement.", startDate: "2026-03-18", endDate: "2026-03-20", location: "Las Vegas Convention Center, NV", country: "United States", industries: ["hardware", "tools", "home improvement", "garden", "consumer goods", "construction"], url: "https://www.nationalhardwareshow.com/", source: src },
    { id: "c-jck", name: "JCK Las Vegas 2026", description: "Leading annual jewelry trade show. 30,000+ professionals, 1,800+ global exhibitors covering fine jewelry, watches, and gems.", startDate: "2026-05-29", endDate: "2026-06-01", location: "The Venetian Expo, Las Vegas, NV", country: "United States", industries: ["jewelry", "watches", "gems", "luxury", "accessories", "consumer goods"], url: "https://www.jckonline.com/", source: src },
    { id: "c-cosmoprof", name: "Cosmoprof North America 2026", description: "Connects beauty brands with distributors and retail buyers across skincare, cosmetics, and personal care.", startDate: "2026-07-13", endDate: "2026-07-15", location: "Las Vegas, NV", country: "United States", industries: ["beauty", "cosmetics", "personal care", "consumer goods", "skincare"], url: "https://www.cosmoprofnorthamerica.com/", source: src },
    { id: "c-white-label", name: "White Label World Expo 2026", description: "Gateway to hundreds of niche product opportunities for e-commerce and private label brands. 10,000+ attendees.", startDate: "2026-09-23", endDate: "2026-09-24", location: "Las Vegas, NV", country: "United States", industries: ["e-commerce", "private label", "consumer goods", "retail", "wholesale"], url: "https://www.whitelabelworldexpo.com/", source: src },

    // ═══════════════════════════════════════════════
    // LOGISTICS & SUPPLY CHAIN
    // ═══════════════════════════════════════════════
    { id: "c-modex", name: "MODEX 2026", description: "Leading supply chain and logistics trade show. 50,000 attendees, 1,000+ exhibits, 200 educational sessions covering warehousing, automation, and distribution.", startDate: "2026-04-13", endDate: "2026-04-16", location: "Georgia World Congress Center, Atlanta, GA", country: "United States", industries: ["logistics", "supply chain", "warehousing", "automation", "distribution", "manufacturing"], url: "https://www.modexshow.com/", source: src },
    { id: "c-link", name: "LINK 2026 — Retail Supply Chain Conference", description: "RILA-hosted event with 280+ exhibitors for retailers, grocers, and manufacturers on supply chain innovation.", startDate: "2026-02-01", endDate: "2026-02-04", location: "Orlando, FL", country: "United States", industries: ["logistics", "supply chain", "retail", "distribution", "manufacturing"], url: "https://www.rila.org/events/link", source: src },
    { id: "c-manifest", name: "Manifest 2026 — Future of Logistics", description: "Supply chain and logistics technology event with 400+ thought leaders. Interactive expo, networking, and deal-making.", startDate: "2026-02-09", endDate: "2026-02-11", location: "Las Vegas, NV", country: "United States", industries: ["logistics", "supply chain", "technology", "distribution", "freight"], url: "https://manife.st/", source: src },
    { id: "c-breakbulk", name: "Breakbulk Americas 2026", description: "36-year-old trade event with 330+ exhibitors serving project cargo, breakbulk, and heavy-lift shipping across the Americas.", startDate: "2026-09-22", endDate: "2026-09-24", location: "Houston, TX", country: "United States", industries: ["logistics", "shipping", "freight", "supply chain", "maritime", "heavy equipment"], url: "https://americas.breakbulk.com/", source: src },
    { id: "c-cscmp", name: "CSCMP EDGE 2026", description: "Premier supply chain conference bringing thousands of professionals with 175+ exhibitors and Startup Alley.", startDate: "2026-10-04", endDate: "2026-10-07", location: "Nashville, TN", country: "United States", industries: ["logistics", "supply chain", "distribution", "manufacturing", "technology"], url: "https://cscmpedge.org/", source: src },

    // ═══════════════════════════════════════════════
    // MARINE & BOATING
    // ═══════════════════════════════════════════════
    { id: "c-flibs", name: "Fort Lauderdale International Boat Show 2026", description: "One of the largest boat shows globally. 100,000+ attendees, 1,200+ exhibitors covering boats, marine gear, and accessories.", startDate: "2026-10-28", endDate: "2026-11-01", location: "Fort Lauderdale, FL", country: "United States", industries: ["marine", "boating", "nautical", "outdoor", "sports"], url: "https://www.flibs.com/", source: src },

    // ═══════════════════════════════════════════════
    // GENERAL TRADE & MULTI-SECTOR
    // ═══════════════════════════════════════════════
    { id: "c-canton-p1", name: "Canton Fair (Phase 1) — Spring 2026", description: "China's largest trade fair, 25,000+ exhibitors. Phase 1: electronics, machinery, vehicles, building materials, lighting.", startDate: "2026-04-15", endDate: "2026-04-19", location: "Guangzhou, China", country: "China", industries: ["manufacturing", "electronics", "machinery", "industrial", "consumer goods", "general trade"], url: "https://www.cantonfair.org.cn/en/", source: src },
    { id: "c-canton-p2", name: "Canton Fair (Phase 2) — Spring 2026", description: "Phase 2: consumer goods, gifts, home decorations, textiles, leather, sporting goods, and office supplies.", startDate: "2026-04-23", endDate: "2026-04-27", location: "Guangzhou, China", country: "China", industries: ["consumer goods", "textiles", "leather", "sporting goods", "gifts", "apparel", "gloves", "general trade"], url: "https://www.cantonfair.org.cn/en/", source: src },
    { id: "c-expocomer", name: "EXPOCOMER 2026", description: "Central America's largest trade fair in Panama. Gateway to Latin American markets for US exporters across all industries.", startDate: "2026-03-18", endDate: "2026-03-21", location: "Panama City, Panama", country: "Panama", industries: ["general trade", "manufacturing", "consumer goods", "food", "industrial"], url: "https://expocomer.com/", source: src },
    { id: "c-asi", name: "ASI Show Chicago 2026", description: "Promotional products and services trade show. Thousands of custom branded items, educational sessions, and networking.", startDate: "2026-07-21", endDate: "2026-07-23", location: "McCormick Place, Chicago, IL", country: "United States", industries: ["promotional products", "marketing", "consumer goods", "printing", "apparel", "accessories"], url: "https://www.asishow.com/", source: src },

    // ═══════════════════════════════════════════════
    // AGRICULTURE
    // ═══════════════════════════════════════════════
    { id: "c-world-ag", name: "World Ag Expo 2027", description: "Largest annual agricultural show. 100,000+ visitors, 1,200+ exhibitors, 2.6M sq ft exhibit space covering tractors, equipment, and technology.", startDate: "2027-02-09", endDate: "2027-02-11", location: "Tulare, CA", country: "United States", industries: ["agriculture", "farming", "machinery", "equipment", "agtech"], url: "https://www.worldagexpo.com/", source: src },
    { id: "c-organic-produce", name: "Organic Produce Summit 2026", description: "Must-attend event for organic produce professionals with farm tours and grassroots networking.", startDate: "2026-07-14", endDate: "2026-07-16", location: "Monterey, CA", country: "United States", industries: ["agriculture", "organic", "produce", "food", "farming"], url: "https://www.organicproducesummit.com/", source: src },

    // ═══════════════════════════════════════════════
    // CHEMICALS & PLASTICS
    // ═══════════════════════════════════════════════
    { id: "c-npe", name: "NPE 2027 — The Plastics Show", description: "World's largest plastics trade show held every 3 years. Injection molding, extrusion, packaging, and recycling technology.", startDate: "2027-05-03", endDate: "2027-05-07", location: "Orange County Convention Center, Orlando, FL", country: "United States", industries: ["plastics", "rubber", "chemicals", "manufacturing", "packaging", "consumer goods"], url: "https://www.npe.org/", source: src },

    // ═══════════════════════════════════════════════
    // HR & PROFESSIONAL SERVICES
    // ═══════════════════════════════════════════════
    { id: "c-shrm", name: "SHRM Annual Conference 2026", description: "Largest HR conference globally showcasing payroll, benefits, workforce analytics, and people management technology.", startDate: "2026-06-14", endDate: "2026-06-17", location: "Las Vegas, NV", country: "United States", industries: ["human resources", "professional services", "technology", "workforce"], url: "https://www.shrm.org/", source: src },

    // ═══════════════════════════════════════════════
    // GROCERY & RETAIL
    // ═══════════════════════════════════════════════
    { id: "c-nga", name: "The NGA Show 2026", description: "Premier event for independent grocery retail. 3,500+ professionals, 350+ exhibitors covering store design, merchandising, and supply chain.", startDate: "2026-03-08", endDate: "2026-03-10", location: "Caesars Forum, Las Vegas, NV", country: "United States", industries: ["grocery", "retail", "food", "consumer goods", "supply chain"], url: "https://www.thengashow.com/", source: src },

    // ═══════════════════════════════════════════════
    // NATURAL & HEALTH PRODUCTS
    // ═══════════════════════════════════════════════
    { id: "c-expo-west", name: "Natural Products Expo West 2027", description: "Industry's defining event for natural, organic, and healthy products. 60,000+ attendees, 2,200+ exhibitors.", startDate: "2027-03-02", endDate: "2027-03-05", location: "Anaheim Convention Center, CA", country: "United States", industries: ["natural products", "organic", "health", "food", "supplements", "beauty", "consumer goods"], url: "https://www.expowest.com/", source: src },

    // ═══════════════════════════════════════════════
    // DAIRY
    // ═══════════════════════════════════════════════
    { id: "c-dairy-expo", name: "World Dairy Expo 2026", description: "Biennial international dairy event. 60,000+ visitors from 100+ countries covering dairy equipment, genetics, and nutrition.", startDate: "2026-09-29", endDate: "2026-10-03", location: "Alliant Energy Center, Madison, WI", country: "United States", industries: ["dairy", "agriculture", "food", "farming", "equipment"], url: "https://www.worlddairyexpo.com/", source: src },

    // ═══════════════════════════════════════════════
    // SEAFOOD
    // ═══════════════════════════════════════════════
    { id: "c-seafood-expo", name: "Seafood Expo North America 2027", description: "North America's largest seafood trade exposition. Exhibitors from 50+ countries covering fresh, frozen, and processed seafood.", startDate: "2027-03-07", endDate: "2027-03-09", location: "Boston Convention Center, MA", country: "United States", industries: ["seafood", "food", "fishing", "marine", "food processing"], url: "https://www.seafoodexpo.com/north-america/", source: src },
  ];

  const industryLower = industry.toLowerCase();
  const countriesLower = countries.map((c) => c.toLowerCase());

  // Broad keyword extraction — split product description into meaningful words
  const industryWords = industryLower
    .split(/[\s,;/&+\-()]+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/s$/, "")); // basic stemming: "gloves" → "glove"

  // Score each show by relevance
  const scored = shows.map((s) => {
    let score = 0;
    const showText = (s.industries.join(" ") + " " + s.name + " " + s.description).toLowerCase();

    // Direct industry tag match (strongest signal)
    for (const tag of s.industries) {
      if (industryLower.includes(tag) || tag.includes(industryLower)) {
        score += 3;
        break;
      }
    }

    // Word-level matching against industry tags and description
    for (const word of industryWords) {
      if (showText.includes(word)) {
        score += 1.5;
      }
    }

    // Country match — show is in a target country
    if (countriesLower.some((c) => s.country.toLowerCase().includes(c) || c.includes(s.country.toLowerCase()))) {
      score += 2;
    }

    // US shows get a small boost since most users are US exporters
    if (s.country === "United States") score += 0.5;

    // General/multi-sector trade shows always somewhat relevant
    if (s.industries.includes("general trade") || s.industries.includes("consumer goods")) score += 0.5;

    // Large flagship shows get a small boost
    if (s.description.includes("100,000+") || s.description.includes("largest") || s.description.includes("leading")) score += 0.3;

    return { show: s, score };
  });

  // Return ALL shows sorted by relevance — matched shows first, then everything else
  // This ensures the trade events page always has a full calendar to browse
  return scored
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
