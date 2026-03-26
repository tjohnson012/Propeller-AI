/**
 * Trade Event Filter Options API
 *
 * GET /api/trade-events/filters
 * Returns distinct industries, countries, regions, sources for dynamic filter dropdowns.
 */

import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { data, error } = await supabase.rpc("get_trade_event_filters");

    if (error) {
      console.error("[trade-events/filters] Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? { industries: [], countries: [], regions: [], sources: [] });
  } catch (err) {
    console.error("[trade-events/filters] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
