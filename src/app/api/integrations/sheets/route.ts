import { NextRequest, NextResponse } from "next/server";
import { searchHSCodes, lookupHSCode } from "@/lib/data/hts";
import { screenEntity } from "@/lib/data/ofac";
import { getTradeFlows } from "@/lib/data/comtrade";

/**
 * Google Sheets / Excel integration.
 * Processes spreadsheet data and returns structured results
 * that can be written back to sheets.
 *
 * Actions:
 * - classify: Take product rows → return HS codes + duty rates
 * - screen: Take entity rows → return OFAC screening results
 * - enrich: Take buyer rows → return trade flow + market data
 * - export: Format internal data as sheet-ready JSON (rows + columns)
 */
export async function POST(request: NextRequest) {
  try {
    const { action, rows } = await request.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    switch (action) {
      case "classify": {
        // Input: [{ product: "industrial valves" }, ...]
        // Output: same rows enriched with HS code, duty rate, FTA
        const results = rows.map((row: { product: string }) => {
          const matches = searchHSCodes(row.product);
          const best = matches[0];
          return {
            ...row,
            hs_code: best?.code ?? "",
            hs_description: best?.description ?? "No match found",
            duty_rate: best?.generalDutyRate ?? "",
            fta_programs: (best ? lookupHSCode(best.code)?.specialPrograms : [])?.join(", ") ?? "",
          };
        });

        return NextResponse.json({
          columns: ["product", "hs_code", "hs_description", "duty_rate", "fta_programs"],
          rows: results,
          count: results.length,
        });
      }

      case "screen": {
        // Input: [{ entity: "Sberbank" }, ...]
        const results = await Promise.all(
          rows.slice(0, 50).map(async (row: { entity: string }) => {
            try {
              const result = await screenEntity(row.entity);
              const flagged = result.matches.length > 0 && result.matches[0].score > 80;
              return {
                ...row,
                status: flagged ? "FLAGGED" : "CLEAR",
                match_score: result.matches[0]?.score ?? 0,
                matched_name: result.matches[0]?.entry.name ?? "",
                list: result.matches[0]?.entry.program ?? "",
                lists_checked: result.listsChecked.join(", "),
              };
            } catch {
              return { ...row, status: "ERROR", match_score: 0, matched_name: "", list: "", lists_checked: "" };
            }
          })
        );

        return NextResponse.json({
          columns: ["entity", "status", "match_score", "matched_name", "list", "lists_checked"],
          rows: results,
          count: results.length,
        });
      }

      case "enrich": {
        // Input: [{ hs_code: "848180", country: "DE" }, ...]
        const results = await Promise.all(
          rows.slice(0, 20).map(async (row: { hs_code: string; country?: string }) => {
            try {
              const flows = await getTradeFlows(row.hs_code.replace(".", ""), "import");
              const topMarket = flows.partners[0];
              return {
                ...row,
                top_importer: topMarket?.country ?? "",
                top_value_usd: topMarket?.tradeValue ?? 0,
                total_partners: flows.partners.length,
              };
            } catch {
              return { ...row, top_importer: "", top_value_usd: 0, total_partners: 0 };
            }
          })
        );

        return NextResponse.json({
          columns: ["hs_code", "top_importer", "top_value_usd", "total_partners"],
          rows: results,
          count: results.length,
        });
      }

      case "export": {
        // Format data for export to sheets
        return NextResponse.json({
          columns: Object.keys(rows[0] || {}),
          rows,
          count: rows.length,
          format: "sheets",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action. Use: classify, screen, enrich, or export" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Sheets integration error:", error);
    return NextResponse.json({ error: "Failed to process data" }, { status: 500 });
  }
}
