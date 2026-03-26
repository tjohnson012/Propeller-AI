/**
 * Trade Events Search/List API
 *
 * GET /api/trade-events?q=&industry=&region=&country=&dateFrom=&dateTo=&source=&featured=&page=&limit=&sort=
 *
 * Returns paginated trade events with full-text search support.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() || "";
  const industry = params.get("industry") || "";
  const region = params.get("region") || "";
  const country = params.get("country") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const source = params.get("source") || "";
  const featured = params.get("featured") || "";
  const bookmarked = params.get("bookmarked") || "";
  const sort = params.get("sort") || "date";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "24", 10)));
  const offset = (page - 1) * limit;

  try {
    // Build query
    let query = supabase
      .from("trade_events")
      .select("*", { count: "exact" });

    // Full-text search
    if (q) {
      // Use websearch_to_tsquery for natural language queries
      query = query.textSearch("search_vector", q, { type: "websearch" });
    }

    // Industry filter (array contains)
    if (industry) {
      query = query.contains("industries", [industry.toLowerCase()]);
    }

    // Region filter
    if (region) {
      query = query.eq("region", region);
    }

    // Country filter
    if (country) {
      query = query.ilike("country", `%${country}%`);
    }

    // Date range
    if (dateFrom) {
      query = query.gte("start_date", dateFrom);
    } else {
      // Default: future events only
      query = query.gte("start_date", new Date().toISOString().split("T")[0]);
    }
    if (dateTo) {
      query = query.lte("start_date", dateTo);
    }

    // Source filter
    if (source) {
      query = query.eq("source", source);
    }

    // Featured filter
    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    // Sort
    if (sort === "name") {
      query = query.order("name", { ascending: true });
    } else {
      query = query.order("start_date", { ascending: true });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, count, error } = await query;

    if (error) {
      console.error("[trade-events] Query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;

    return NextResponse.json({
      events: events ?? [],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[trade-events] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
