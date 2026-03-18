/**
 * Daily Compliance Screening Cron Endpoint
 *
 * Triggered by Vercel Cron at 6:00 AM UTC daily.
 * 1. Re-screens all active watchlist entities against the Consolidated Screening List
 * 2. Runs incremental Google Sheets sync for all connected users
 *
 * Security: Requires CRON_SECRET authorization header.
 */

import { runMonitoringSweep } from "@/lib/data/monitoring";
import { getAllConnectionsForPlatform } from "@/lib/integrations/connections";
import { runIncrementalSyncForConnection } from "@/lib/integrations/sheets-sync";

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 1. Run monitoring sweep (screens watchlist + sends Slack alerts)
    const result = await runMonitoringSweep();

    // 2. Run incremental Sheets sync for all connected users
    let sheetsSynced = 0;
    let sheetsErrors = 0;

    const sheetsConnections = await getAllConnectionsForPlatform("sheets");
    for (const connection of sheetsConnections) {
      try {
        const syncResult = await runIncrementalSyncForConnection(connection);
        if (syncResult) sheetsSynced++;
      } catch (error) {
        console.error(
          `[cron] Sheets sync failed for user ${connection.user_id}:`,
          error,
        );
        sheetsErrors++;
      }
      // Rate limit: 1s delay between users for Google API
      if (sheetsConnections.indexOf(connection) < sheetsConnections.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return Response.json({
      success: true,
      monitoring: {
        checked: result.checked,
        alerts: result.alerts,
        duration: `${result.duration}ms`,
      },
      sheets: {
        synced: sheetsSynced,
        errors: sheetsErrors,
        total: sheetsConnections.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
