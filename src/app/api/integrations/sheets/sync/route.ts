import { NextRequest, NextResponse } from "next/server";
import { getConnection, revokeConnection } from "@/lib/integrations/connections";
import {
  runInitialSheetSync,
  runIncrementalSheetSync,
} from "@/lib/integrations/sheets-sync";

/**
 * POST — Run a sheet sync action.
 * Body: { action: "initial_sync" | "incremental_sync" | "disconnect", sheetUrl?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sheetUrl } = body;

    switch (action) {
      case "initial_sync": {
        if (!sheetUrl) {
          return NextResponse.json(
            { error: "sheetUrl is required for initial sync" },
            { status: 400 },
          );
        }
        const result = await runInitialSheetSync(sheetUrl);
        return NextResponse.json({ success: true, ...result });
      }

      case "incremental_sync": {
        const result = await runIncrementalSheetSync();
        if (!result) {
          return NextResponse.json(
            { error: "No active Sheets connection or no new data" },
            { status: 404 },
          );
        }
        return NextResponse.json({ success: true, ...result });
      }

      case "disconnect": {
        await revokeConnection("sheets");
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[sheets/sync] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET — Return current Sheets sync status.
 */
export async function GET() {
  const connection = await getConnection("sheets");

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const meta = connection.metadata as {
    sheet_url?: string;
    spreadsheet_id?: string;
    entity_count?: number;
    last_sync_at?: string;
  };

  return NextResponse.json({
    connected: true,
    sheetUrl: meta.sheet_url || null,
    spreadsheetId: meta.spreadsheet_id || null,
    entityCount: meta.entity_count || 0,
    lastSyncAt: meta.last_sync_at || null,
  });
}
