/**
 * Seed curated trade shows into Supabase trade_events table.
 * Maps existing getMajorTradeShows() data to the DB schema and upserts.
 */

import { createServiceSupabase } from "@/lib/supabase/service";
import { getMajorTradeShows } from "./trade-events";

const REGION_MAP: Record<string, string> = {
  "united states": "North America",
  "canada": "North America",
  "mexico": "Latin America",
  "germany": "Europe",
  "france": "Europe",
  "italy": "Europe",
  "spain": "Europe",
  "netherlands": "Europe",
  "poland": "Europe",
  "united kingdom": "Europe",
  "switzerland": "Europe",
  "austria": "Europe",
  "belgium": "Europe",
  "sweden": "Europe",
  "norway": "Europe",
  "denmark": "Europe",
  "finland": "Europe",
  "czech republic": "Europe",
  "china": "Asia",
  "japan": "Asia",
  "south korea": "Asia",
  "india": "Asia",
  "singapore": "Asia",
  "vietnam": "Asia",
  "thailand": "Asia",
  "philippines": "Asia",
  "indonesia": "Asia",
  "malaysia": "Asia",
  "taiwan": "Asia",
  "bangladesh": "Asia",
  "pakistan": "Asia",
  "brazil": "Latin America",
  "colombia": "Latin America",
  "chile": "Latin America",
  "argentina": "Latin America",
  "peru": "Latin America",
  "panama": "Latin America",
  "costa rica": "Latin America",
  "ecuador": "Latin America",
  "uruguay": "Latin America",
  "united arab emirates": "Middle East",
  "saudi arabia": "Middle East",
  "israel": "Middle East",
  "jordan": "Middle East",
  "qatar": "Middle East",
  "bahrain": "Middle East",
  "oman": "Middle East",
  "kuwait": "Middle East",
  "south africa": "Africa",
  "nigeria": "Africa",
  "kenya": "Africa",
  "egypt": "Africa",
  "morocco": "Africa",
  "ghana": "Africa",
  "ethiopia": "Africa",
  "tanzania": "Africa",
};

function deriveRegion(country: string): string {
  return REGION_MAP[country.toLowerCase()] || "Other";
}

function deriveCity(location: string): string {
  // Extract city from location strings like "McCormick Place, Chicago, IL"
  const parts = location.split(",").map((s) => s.trim());
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
  return parts[0] || "";
}

function extractAttendeeCount(description: string): string | null {
  const match = description.match(/([\d,]+\+?)\s*(?:attendees|visitors|professionals)/i);
  return match ? match[1] : null;
}

function extractExhibitorCount(description: string): string | null {
  const match = description.match(/([\d,]+\+?)\s*exhibitors/i);
  return match ? match[1] : null;
}

export async function seedCuratedShows(): Promise<{ inserted: number; errors: number }> {
  const supabase = createServiceSupabase();
  if (!supabase) throw new Error("Supabase service client not available");

  const shows = getMajorTradeShows("", []);
  let inserted = 0;
  let errors = 0;

  // Batch upsert in chunks of 50
  const rows = shows.map((show) => ({
    external_id: `curated-${show.id}`,
    name: show.name,
    description: show.description,
    start_date: show.startDate,
    end_date: show.endDate || null,
    location: show.location,
    city: deriveCity(show.location),
    country: show.country,
    region: deriveRegion(show.country),
    industries: show.industries,
    url: show.url,
    registration_url: show.registrationUrl || null,
    source: show.source,
    cost: show.cost || null,
    attendee_count: extractAttendeeCount(show.description),
    exhibitor_count: extractExhibitorCount(show.description),
    is_featured: true,
    is_verified: true,
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from("trade_events")
      .upsert(batch, { onConflict: "external_id" });

    if (error) {
      console.error(`[seed] Batch ${i / 50 + 1} failed:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}
