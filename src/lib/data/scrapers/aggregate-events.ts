/**
 * Trade event aggregator.
 *
 * Runs all sources in parallel, deduplicates by name prefix + start_date + country,
 * and upserts into the trade_events Supabase table. Cleans up past events (>30 days old).
 */

import { createServiceSupabase } from "@/lib/supabase/service";
import { seedCuratedShows } from "../trade-events-seed";
import { scrape10times } from "./scrape-10times";
import { scrapeEventsEye } from "./scrape-eventseye";

const REGION_MAP: Record<string, string> = {
  "united states": "North America",
  "canada": "North America",
  "mexico": "Latin America",
  "germany": "Europe",
  "france": "Europe",
  "italy": "Europe",
  "spain": "Europe",
  "netherlands": "Europe",
  "united kingdom": "Europe",
  "switzerland": "Europe",
  "china": "Asia",
  "japan": "Asia",
  "south korea": "Asia",
  "india": "Asia",
  "singapore": "Asia",
  "taiwan": "Asia",
  "brazil": "Latin America",
  "colombia": "Latin America",
  "chile": "Latin America",
  "argentina": "Latin America",
  "panama": "Latin America",
  "united arab emirates": "Middle East",
  "saudi arabia": "Middle East",
  "south africa": "Africa",
  "nigeria": "Africa",
  "kenya": "Africa",
  "egypt": "Africa",
};

function deriveRegion(country: string): string {
  return REGION_MAP[country.toLowerCase()] || "Other";
}

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
  venue?: string | null;
  organizer?: string | null;
}

function deduplicationKey(event: ScrapedEvent): string {
  const namePrefix = event.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  const country = event.country.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
  return `${namePrefix}-${event.start_date}-${country}`;
}

export async function aggregateEvents(): Promise<{
  curated: number;
  scraped10times: number;
  scrapedEventsEye: number;
  upserted: number;
  cleaned: number;
  errors: string[];
}> {
  const supabase = createServiceSupabase();
  if (!supabase) throw new Error("Supabase service client not available");

  const errors: string[] = [];
  let curated = 0;
  let scraped10times = 0;
  let scrapedEventsEye = 0;

  // Run all sources in parallel
  const [curatedResult, tenTimesResult, eventsEyeResult] = await Promise.allSettled([
    seedCuratedShows(),
    scrape10times(),
    scrapeEventsEye(),
  ]);

  if (curatedResult.status === "fulfilled") {
    curated = curatedResult.value.inserted;
  } else {
    errors.push(`Curated seed failed: ${curatedResult.reason}`);
  }

  // Collect scraped events for dedup + upsert
  const allScraped: ScrapedEvent[] = [];
  if (tenTimesResult.status === "fulfilled") {
    scraped10times = tenTimesResult.value.length;
    allScraped.push(...tenTimesResult.value);
  } else {
    errors.push(`10times scraper failed: ${tenTimesResult.reason}`);
  }

  if (eventsEyeResult.status === "fulfilled") {
    scrapedEventsEye = eventsEyeResult.value.length;
    allScraped.push(...eventsEyeResult.value);
  } else {
    errors.push(`EventsEye scraper failed: ${eventsEyeResult.reason}`);
  }

  // Deduplicate scraped events
  const seen = new Set<string>();
  const uniqueScraped: ScrapedEvent[] = [];
  for (const event of allScraped) {
    const key = deduplicationKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueScraped.push(event);
  }

  // Upsert scraped events
  let upserted = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < uniqueScraped.length; i += BATCH_SIZE) {
    const batch = uniqueScraped.slice(i, i + BATCH_SIZE).map((e) => ({
      external_id: e.external_id,
      name: e.name,
      description: e.description,
      start_date: e.start_date,
      end_date: e.end_date,
      location: e.location,
      city: e.city,
      country: e.country,
      region: deriveRegion(e.country),
      industries: e.industries,
      url: e.url,
      source: e.source,
      venue: e.venue || null,
      organizer: e.organizer || null,
      is_featured: false,
      is_verified: false,
    }));

    const { error } = await supabase
      .from("trade_events")
      .upsert(batch, { onConflict: "external_id" });

    if (error) {
      errors.push(`Batch ${i / BATCH_SIZE + 1} upsert failed: ${error.message}`);
    } else {
      upserted += batch.length;
    }
  }

  // Clean up past events (>30 days old)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Count past events first, then delete
  const { count: pastCount } = await supabase
    .from("trade_events")
    .select("id", { count: "exact", head: true })
    .lt("start_date", thirtyDaysAgo);

  if (pastCount && pastCount > 0) {
    await supabase
      .from("trade_events")
      .delete()
      .lt("start_date", thirtyDaysAgo);
  }

  const cleaned = pastCount ?? 0;

  return {
    curated,
    scraped10times,
    scrapedEventsEye,
    upserted,
    cleaned: cleaned ?? 0,
    errors,
  };
}
