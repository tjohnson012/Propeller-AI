/**
 * Daily Compliance Screening Cron Endpoint
 *
 * Triggered by Vercel Cron at 6:00 AM UTC daily.
 * Re-screens all active watchlist entities against the Consolidated Screening List.
 *
 * Security: Requires CRON_SECRET authorization header.
 */

import { runMonitoringSweep } from "@/lib/data/monitoring";

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runMonitoringSweep();

    return Response.json({
      success: true,
      checked: result.checked,
      alerts: result.alerts,
      duration: `${result.duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
