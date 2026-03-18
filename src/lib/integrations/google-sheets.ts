/**
 * Google Sheets API wrapper.
 *
 * Reads/writes spreadsheet data using the stored OAuth token.
 * Uses the googleapis library for type-safe Sheets v4 interactions.
 */

import { google } from "googleapis";
import { getValidToken } from "./token-refresh";
import { getValidTokenForConnection } from "./token-refresh";
import type { IntegrationConnection } from "./connections";

/**
 * Create an authenticated Sheets client for the current user.
 */
export async function getSheetsClient(userId?: string) {
  const token = await getValidToken("sheets");
  if (!token) return null;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.sheets({ version: "v4", auth });
}

/**
 * Create an authenticated Sheets client from a connection (service-role context).
 */
export async function getSheetsClientForConnection(
  connection: IntegrationConnection,
) {
  const token = await getValidTokenForConnection(connection);
  if (!token) return null;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.sheets({ version: "v4", auth });
}

/**
 * Extract spreadsheet ID from a Google Sheets URL.
 */
export function extractSpreadsheetId(url: string): string | null {
  // Matches: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

/**
 * Read all data from the first sheet of a spreadsheet.
 */
export async function readSheetData(
  spreadsheetId: string,
  sheets?: Awaited<ReturnType<typeof getSheetsClient>>,
): Promise<{ headers: string[]; rows: string[][] } | null> {
  const client = sheets || (await getSheetsClient());
  if (!client) return null;

  // Get spreadsheet metadata to find the first sheet name
  const meta = await client.spreadsheets.get({ spreadsheetId });
  const firstSheet = meta.data.sheets?.[0]?.properties?.title;
  if (!firstSheet) return null;

  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `'${firstSheet}'`,
  });

  const values = response.data.values;
  if (!values || values.length < 2) return null;

  return {
    headers: values[0].map((h: unknown) => String(h || "")),
    rows: values.slice(1).map((row: unknown[]) =>
      row.map((cell: unknown) => String(cell || "")),
    ),
  };
}

/**
 * Heuristic: detect which columns contain entity names and countries.
 */
export function detectEntityColumns(
  headers: string[],
): { entityCol: number; countryCol: number } {
  const entityPatterns = [
    "company",
    "name",
    "customer",
    "entity",
    "buyer",
    "supplier",
    "partner",
    "vendor",
    "client",
    "organization",
  ];
  const countryPatterns = [
    "country",
    "nation",
    "location",
    "region",
    "destination",
  ];

  let entityCol = -1;
  let countryCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const lower = headers[i].toLowerCase().trim();

    if (entityCol < 0 && entityPatterns.some((p) => lower.includes(p))) {
      entityCol = i;
    }
    if (countryCol < 0 && countryPatterns.some((p) => lower.includes(p))) {
      countryCol = i;
    }
  }

  // Fallback: use first column as entity
  if (entityCol < 0) entityCol = 0;

  return { entityCol, countryCol };
}

export interface SheetScreeningRow {
  entity: string;
  status: string;
  riskLevel: string;
  matchScore: number;
  matchedName: string;
  list: string;
  lastScreened: string;
}

/**
 * Write screening results to a "Propeller Screening" tab.
 * Creates the tab if it doesn't exist, or clears and rewrites it.
 */
export async function writeScreeningResults(
  spreadsheetId: string,
  results: SheetScreeningRow[],
  sheets?: Awaited<ReturnType<typeof getSheetsClient>>,
): Promise<void> {
  const client = sheets || (await getSheetsClient());
  if (!client) return;

  const tabName = "Propeller Screening";

  // Check if tab exists
  const meta = await client.spreadsheets.get({ spreadsheetId });
  const existingTab = meta.data.sheets?.find(
    (s) => s.properties?.title === tabName,
  );

  if (!existingTab) {
    // Create the tab
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  } else {
    // Clear existing data
    await client.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${tabName}'`,
    });
  }

  // Write headers + data
  const header = [
    "Entity",
    "Status",
    "Risk Level",
    "Match Score",
    "Matched Name",
    "List",
    "Last Screened",
  ];

  const rows = results.map((r) => [
    r.entity,
    r.status,
    r.riskLevel,
    r.matchScore > 0 ? `${r.matchScore}%` : "",
    r.matchedName,
    r.list,
    r.lastScreened,
  ]);

  await client.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [header, ...rows] },
  });
}

/**
 * Read rows that were added since the last sync (based on row count).
 */
export async function readNewRows(
  spreadsheetId: string,
  lastRowCount: number,
  sheets?: Awaited<ReturnType<typeof getSheetsClient>>,
): Promise<{ headers: string[]; rows: string[][] } | null> {
  const client = sheets || (await getSheetsClient());
  if (!client) return null;

  const meta = await client.spreadsheets.get({ spreadsheetId });
  const firstSheet = meta.data.sheets?.[0]?.properties?.title;
  if (!firstSheet) return null;

  // Read headers
  const headerResp = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `'${firstSheet}'!1:1`,
  });
  const headers = (headerResp.data.values?.[0] || []).map((h: unknown) =>
    String(h || ""),
  );

  // Read new rows (lastRowCount is # of data rows, +1 for header = start row)
  const startRow = lastRowCount + 2; // +1 for header, +1 for 1-indexed
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `'${firstSheet}'!A${startRow}:ZZ`,
  });

  const newRows = response.data.values;
  if (!newRows || newRows.length === 0) return null;

  return {
    headers,
    rows: newRows.map((row: unknown[]) =>
      row.map((cell: unknown) => String(cell || "")),
    ),
  };
}
