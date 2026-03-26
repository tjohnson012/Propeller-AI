/**
 * EventsEye.com trade event scraper.
 *
 * Fetches trade show listings from EventsEye country/sector pages.
 * Static HTML, Cheerio-friendly. Rate-limited to 1 req/s. Max 300 events per run.
 */

import * as cheerio from "cheerio";

interface ScrapedEvent {
  external_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location: string;
  city: string;
  country: string;
  industries: string[];
  url: string;
  source: string;
  venue: string | null;
}

const SECTOR_PAGES = [
  "/fairs/sector/food-beverage-hospitality",
  "/fairs/sector/machinery-industrial",
  "/fairs/sector/building-construction",
  "/fairs/sector/medicine-health",
  "/fairs/sector/agriculture-forestry-fishing",
  "/fairs/sector/electronics-electrical",
  "/fairs/sector/fashion-textiles-leather",
  "/fairs/sector/automotive-transport",
  "/fairs/sector/energy-environment",
  "/fairs/sector/sports-leisure",
  "/fairs/sector/chemicals-plastics",
  "/fairs/sector/packaging-printing",
];

const BASE_URL = "https://www.eventseye.com";
const USER_AGENT = "PropellerAI/1.0 (trade research tool)";
const RATE_LIMIT_MS = 1000;
const MAX_EVENTS = 300;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function sectorToIndustry(path: string): string {
  const map: Record<string, string> = {
    "food-beverage-hospitality": "food",
    "machinery-industrial": "manufacturing",
    "building-construction": "construction",
    "medicine-health": "healthcare",
    "agriculture-forestry-fishing": "agriculture",
    "electronics-electrical": "electronics",
    "fashion-textiles-leather": "textiles",
    "automotive-transport": "automotive",
    "energy-environment": "energy",
    "sports-leisure": "sports",
    "chemicals-plastics": "chemicals",
    "packaging-printing": "packaging",
  };
  const key = path.split("/").pop() || "";
  return map[key] || key;
}

function parseEventsFromPage(html: string, sectorPath: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];
  const industry = sectorToIndustry(sectorPath);

  // EventsEye uses table rows or list items for events
  $("tr, .fair-item, .event-row, li").each((_, el) => {
    const $el = $(el);
    const nameEl = $el.find("a[href*='/fairs/']").first();
    const name = nameEl.text().trim();
    if (!name || name.length < 3) return;

    const link = nameEl.attr("href") || "";
    const dateText = $el.find("td:nth-child(2), .date, .fair-date").text().trim();
    const locationText = $el.find("td:nth-child(3), .location, .fair-location").text().trim();
    const venueText = $el.find("td:nth-child(4), .venue, .fair-venue").text().trim();

    const startDate = parseDateFuzzy(dateText);
    if (!startDate) return;

    // Extract city and country from location
    const locParts = locationText.split(",").map((s) => s.trim());
    const city = locParts[0] || "";
    const country = locParts[locParts.length - 1] || "";

    events.push({
      external_id: `eventseye-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${startDate}`,
      name,
      description: "",
      start_date: startDate,
      end_date: null,
      location: locationText,
      city,
      country,
      industries: [industry],
      url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
      source: "EventsEye",
      venue: venueText || null,
    });
  });

  return events;
}

function parseDateFuzzy(text: string): string | null {
  try {
    const d = new Date(text);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {
    // ignore
  }
  const match = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d{4})/i);
  if (match) {
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  // Try YYYY-MM-DD
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  return null;
}

export async function scrapeEventsEye(): Promise<ScrapedEvent[]> {
  const allEvents: ScrapedEvent[] = [];
  const seen = new Set<string>();

  for (const sectorPath of SECTOR_PAGES) {
    if (allEvents.length >= MAX_EVENTS) break;

    const url = `${BASE_URL}${sectorPath}`;
    const html = await fetchPage(url);
    if (!html) {
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const events = parseEventsFromPage(html, sectorPath);
    for (const event of events) {
      if (seen.has(event.external_id)) continue;
      seen.add(event.external_id);
      allEvents.push(event);
      if (allEvents.length >= MAX_EVENTS) break;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[scrape-eventseye] Scraped ${allEvents.length} events from ${SECTOR_PAGES.length} sectors`);
  return allEvents;
}
