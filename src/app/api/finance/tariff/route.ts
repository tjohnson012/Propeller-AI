/**
 * Tariff lookup — combines MFN (WITS) and preferential (trade.gov FTA) rates
 * for a given HS code + destination country.
 */

import { NextRequest } from "next/server";
import { getTariffRates } from "@/lib/data/tariffs";
import { lookupHSCode, searchHSCodes } from "@/lib/data/hts";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hsCode = searchParams.get("hs")?.trim();
  const country = searchParams.get("country")?.trim();

  if (!hsCode || !country) {
    return Response.json(
      { error: "Provide both `hs` and `country` query params." },
      { status: 400 },
    );
  }

  const rates = await getTariffRates(hsCode, country);
  // Try exact match first, then keyword fallback so users can type either
  // "8481.80" or "industrial valves" and get something useful.
  const exact = lookupHSCode(hsCode);
  const hs = exact ?? searchHSCodes(hsCode)[0];
  const description = exact?.description ?? hs?.description ?? null;
  const dutyRate = exact?.generalDutyRate ?? (hs && "generalDutyRate" in hs ? hs.generalDutyRate : null);

  return Response.json({
    hsCode,
    country,
    hsDescription: description,
    usGeneralDuty: dutyRate,
    rates,
    retrievedAt: new Date().toISOString(),
  });
}
