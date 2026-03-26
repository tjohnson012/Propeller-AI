/**
 * 10times.com trade event scraper.
 *
 * Fetches trade show listings from 10times.com category pages,
 * extracts JSON-LD structured data when available, falls back to HTML parsing.
 * Rate-limited to 1 request per 2 seconds. Max 200 events per run.
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
  organizer: string | null;
}

const CATEGORIES = [
  "manufacturing",
  "food-beverage",
  "automotive",
  "medical-pharma",
  "technology",
  "construction",
  "energy",
  "agriculture",
  "textiles-apparel",
  "packaging",
  "logistics",
  "consumer-goods",
  "electronics",
  "aerospace-defense",
];

const BASE_URL = "https://10times.com";
const USER_AGENT = "PropellerAI/1.0 (trade research tool)";
const RATE_LIMIT_MS = 2000;
const MAX_EVENTS = 200;

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

function parseEventsFromPage(html: string, category: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  // Try JSON-LD first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] !== "Event") continue;
        const name = item.name;
        const startDate = item.startDate?.split("T")[0];
        if (!name || !startDate) continue;

        events.push({
          external_id: `10times-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${startDate}`,
          name,
          description: item.description || "",
          start_date: startDate,
          end_date: item.endDate?.split("T")[0] || null,
          location: item.location?.name || item.location?.address?.addressLocality || "",
          city: item.location?.address?.addressLocality || "",
          country: item.location?.address?.addressCountry || "",
          industries: [category.replace(/-/g, " ")],
          url: item.url || "",
          source: "10times.com",
          venue: item.location?.name || null,
          organizer: item.organizer?.name || null,
        });
      }
    } catch {
      // Ignore invalid JSON-LD
    }
  });

  // Fallback: parse event listing cards
  if (events.length === 0) {
    $(".event-card, .listing-card, [data-event-name]").each((_, el) => {
      const $el = $(el);
      const name = $el.find("h2, h3, .event-name, [data-event-name]").first().text().trim();
      const dateText = $el.find(".date, .event-date, time").first().text().trim();
      const location = $el.find(".venue, .location, .event-location").first().text().trim();
      const link = $el.find("a").first().attr("href") || "";

      if (!name) return;

      const startDate = parseDateFuzzy(dateText);
      if (!startDate) return;

      events.push({
        external_id: `10times-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${startDate}`,
        name,
        description: "",
        start_date: startDate,
        end_date: null,
        location,
        city: location.split(",")[0]?.trim() || "",
        country: location.split(",").pop()?.trim() || "",
        industries: [category.replace(/-/g, " ")],
        url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
        source: "10times.com",
        venue: null,
        organizer: null,
      });
    });
  }

  return events;
}

function parseDateFuzzy(text: string): string | null {
  try {
    const d = new Date(text);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {
    // ignore
  }
  // Try extracting a date pattern
  const match = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);
  if (match) {
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return null;
}

export async function scrape10times(): Promise<ScrapedEvent[]> {
  const allEvents: ScrapedEvent[] = [];
  const seen = new Set<string>();

  for (const category of CATEGORIES) {
    if (allEvents.length >= MAX_EVENTS) break;

    const url = `${BASE_URL}/${category}/tradeshows`;
    const html = await fetchPage(url);
    if (!html) {
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const events = parseEventsFromPage(html, category);
    for (const event of events) {
      if (seen.has(event.external_id)) continue;
      seen.add(event.external_id);
      allEvents.push(event);
      if (allEvents.length >= MAX_EVENTS) break;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[scrape-10times] Scraped ${allEvents.length} events from ${CATEGORIES.length} categories`);
  return allEvents;
}
