/**
 * Weekly Trade Events Cron Endpoint
 *
 * Triggered by Vercel Cron weekly (Mondays 4AM UTC).
 * Runs the aggregator: seeds curated shows, scrapes 10times + EventsEye,
 * deduplicates, and upserts into Supabase.
 *
 * Supports ?force=true for manual trigger.
 * Security: Requires CRON_SECRET authorization header.
 */

import { aggregateEvents } from "@/lib/data/scrapers/aggregate-events";

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await aggregateEvents();

    return Response.json({
      success: true,
      curated: result.curated,
      scraped10times: result.scraped10times,
      scrapedEventsEye: result.scrapedEventsEye,
      upserted: result.upserted,
      cleaned: result.cleaned,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
