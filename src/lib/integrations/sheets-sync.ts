/**
 * Google Sheets sync orchestrator.
 *
 * Handles initial full sync and incremental delta syncs:
 * 1. Read sheet data
 * 2. Detect entity/country columns
 * 3. Screen each entity against CSL
 * 4. Write results to "Propeller Screening" tab
 * 5. Add entities to monitoring watchlist
 */

import { screenEntity } from "@/lib/data/ofac";
import {
  getWatchlistEntities,
  saveWatchlistEntity,
} from "@/lib/supabase/persistence";
import {
  getConnection,
  updateConnectionMetadata,
  type IntegrationConnection,
  updateConnectionMetadataServiceRole,
} from "./connections";
import {
  extractSpreadsheetId,
  readSheetData,
  readNewRows,
  detectEntityColumns,
  writeScreeningResults,
  getSheetsClient,
  getSheetsClientForConnection,
  type SheetScreeningRow,
} from "./google-sheets";

export interface SyncResult {
  entitiesFound: number;
  screened: number;
  flagged: number;
  clear: number;
  addedToWatchlist: number;
}

/**
 * Run a full initial sync of a Google Sheet.
 */
export async function runInitialSheetSync(
  sheetUrl: string,
): Promise<SyncResult> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) throw new Error("Invalid Google Sheets URL");

  const sheets = await getSheetsClient();
  if (!sheets) throw new Error("Not connected to Google Sheets");

  // 1. Read sheet data
  const data = await readSheetData(spreadsheetId, sheets);
  if (!data) throw new Error("Could not read sheet data (empty or no headers)");

  // 2. Detect entity/country columns
  const { entityCol, countryCol } = detectEntityColumns(data.headers);

  // 3. Get existing watchlist to skip duplicates
  const existingEntities = await getWatchlistEntities();
  const existingNames = new Set(
    existingEntities.map((e) => e.entity_name.toLowerCase()),
  );

  // 4. Screen entities in batches of 5
  const screeningResults: SheetScreeningRow[] = [];
  let flagged = 0;
  let addedToWatchlist = 0;
  const entities = data.rows
    .map((row) => ({
      name: row[entityCol]?.trim(),
      country: countryCol >= 0 ? row[countryCol]?.trim() : undefined,
    }))
    .filter((e) => e.name);

  const batchSize = 5;
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (entity) => {
        const result = await screenEntity(entity.name);
        const topMatch = result.matches[0];

        const row: SheetScreeningRow = {
          entity: entity.name,
          status: result.matched ? "FLAGGED" : "CLEAR",
          riskLevel: result.matched
            ? result.matchScore >= 90
              ? "Critical"
              : result.matchScore >= 70
                ? "High"
                : "Medium"
            : "Low",
          matchScore: result.matchScore,
          matchedName: topMatch?.entry.name || "",
          list: topMatch?.entry.sourceList || "",
          lastScreened: new Date().toISOString().split("T")[0],
        };

        return { entity, result, row };
      }),
    );

    for (const { entity, result, row } of results) {
      screeningResults.push(row);
      if (result.matched) flagged++;

      // 5. Add to watchlist if not already tracked
      if (!existingNames.has(entity.name.toLowerCase())) {
        await saveWatchlistEntity({
          entityName: entity.name,
          entityType: "buyer",
          country: entity.country,
          notes: `Imported from Google Sheet`,
        });
        existingNames.add(entity.name.toLowerCase());
        addedToWatchlist++;
      }
    }
  }

  // 6. Write results to "Propeller Screening" tab
  await writeScreeningResults(spreadsheetId, screeningResults, sheets);

  // 7. Store sync metadata on connection
  await updateConnectionMetadata("sheets", {
    sheet_url: sheetUrl,
    spreadsheet_id: spreadsheetId,
    entity_count: entities.length,
    last_row_count: entities.length,
    last_sync_at: new Date().toISOString(),
  });

  return {
    entitiesFound: entities.length,
    screened: entities.length,
    flagged,
    clear: entities.length - flagged,
    addedToWatchlist,
  };
}

/**
 * Run an incremental sync — detect new rows since last sync.
 * For use in user-session context.
 */
export async function runIncrementalSheetSync(): Promise<SyncResult | null> {
  const connection = await getConnection("sheets");
  if (!connection) return null;

  return runIncrementalSyncForConnection(connection);
}

/**
 * Run incremental sync for a specific connection (service-role context, cron jobs).
 */
export async function runIncrementalSyncForConnection(
  connection: IntegrationConnection,
): Promise<SyncResult | null> {
  const meta = connection.metadata as {
    spreadsheet_id?: string;
    last_row_count?: number;
    sheet_url?: string;
  };

  if (!meta.spreadsheet_id || meta.last_row_count === undefined) return null;

  // Always use connection-based client (works in both user-session and cron/service-role context)
  const sheets = await getSheetsClientForConnection(connection);
  if (!sheets) return null;

  // Read only new rows
  const newData = await readNewRows(
    meta.spreadsheet_id,
    meta.last_row_count,
    sheets,
  );
  if (!newData || newData.rows.length === 0) return null;

  const { entityCol, countryCol } = detectEntityColumns(newData.headers);

  const existingEntities = await getWatchlistEntities();
  const existingNames = new Set(
    existingEntities.map((e) => e.entity_name.toLowerCase()),
  );

  const screeningResults: SheetScreeningRow[] = [];
  let flagged = 0;
  let addedToWatchlist = 0;
  const entities = newData.rows
    .map((row) => ({
      name: row[entityCol]?.trim(),
      country: countryCol >= 0 ? row[countryCol]?.trim() : undefined,
    }))
    .filter((e) => e.name);

  const batchSize = 5;
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (entity) => {
        const result = await screenEntity(entity.name);
        const topMatch = result.matches[0];

        const row: SheetScreeningRow = {
          entity: entity.name,
          status: result.matched ? "FLAGGED" : "CLEAR",
          riskLevel: result.matched
            ? result.matchScore >= 90
              ? "Critical"
              : result.matchScore >= 70
                ? "High"
                : "Medium"
            : "Low",
          matchScore: result.matchScore,
          matchedName: topMatch?.entry.name || "",
          list: topMatch?.entry.sourceList || "",
          lastScreened: new Date().toISOString().split("T")[0],
        };

        return { entity, result, row };
      }),
    );

    for (const { entity, result, row } of results) {
      screeningResults.push(row);
      if (result.matched) flagged++;

      if (!existingNames.has(entity.name.toLowerCase())) {
        await saveWatchlistEntity({
          entityName: entity.name,
          entityType: "buyer",
          country: entity.country,
          notes: "Imported from Google Sheet (incremental sync)",
        });
        existingNames.add(entity.name.toLowerCase());
        addedToWatchlist++;
      }
    }
  }

  // Append only the new screening results (don't re-screen existing rows)
  if (screeningResults.length > 0) {
    await writeScreeningResults(
      meta.spreadsheet_id,
      screeningResults,
      sheets,
      true, // append mode — don't overwrite existing results
    );
  }

  // Update metadata
  const newRowCount = meta.last_row_count + entities.length;
  const metaUpdate = {
    last_row_count: newRowCount,
    entity_count: newRowCount,
    last_sync_at: new Date().toISOString(),
  };

  if (connection.id) {
    await updateConnectionMetadataServiceRole(
      connection.id,
      connection.metadata,
      metaUpdate,
    );
  } else {
    await updateConnectionMetadata("sheets", metaUpdate);
  }

  return {
    entitiesFound: entities.length,
    screened: entities.length,
    flagged,
    clear: entities.length - flagged,
    addedToWatchlist,
  };
}
