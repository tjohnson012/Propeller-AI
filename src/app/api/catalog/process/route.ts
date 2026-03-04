import { NextRequest, NextResponse } from "next/server";
import { searchHSCodes, lookupHSCode } from "@/lib/data/hts";
import { screenEntity } from "@/lib/data/ofac";
import { getTradeFlows } from "@/lib/data/comtrade";

interface ProductInput {
  name: string;
  description: string;
  sku?: string;
  category?: string;
}

interface ProcessedProduct {
  name: string;
  description: string;
  sku?: string;
  hsCode: string | null;
  hsDescription: string | null;
  dutyRate: string | null;
  ftaPrograms: string[];
  topMarkets: Array<{ country: string; value: string }>;
  complianceStatus: "clear" | "review" | "error";
  complianceNote: string;
}

export async function POST(request: NextRequest) {
  try {
    const { products } = (await request.json()) as { products: ProductInput[] };

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 });
    }

    // Process up to 20 products
    const batch = products.slice(0, 20);
    const results: ProcessedProduct[] = [];

    for (const product of batch) {
      const searchTerm = product.description || product.name;

      // 1. HS Code classification
      let hsCode: string | null = null;
      let hsDescription: string | null = null;
      let dutyRate: string | null = null;
      let ftaPrograms: string[] = [];

      const hsResults = searchHSCodes(searchTerm);
      if (hsResults.length > 0) {
        const bestMatch = hsResults[0];
        hsCode = bestMatch.code;
        hsDescription = bestMatch.description;
        dutyRate = bestMatch.generalDutyRate;

        const fullHS = lookupHSCode(bestMatch.code);
        ftaPrograms = fullHS?.specialPrograms ?? [];
      }

      // 2. Trade flow data (top markets)
      let topMarkets: Array<{ country: string; value: string }> = [];
      if (hsCode) {
        try {
          const flows = await getTradeFlows(hsCode.replace(".", ""), "import");
          topMarkets = flows.partners.slice(0, 3).map((p) => ({
            country: p.country,
            value: `$${(p.tradeValue / 1_000_000).toFixed(0)}M`,
          }));
        } catch {
          // Trade flow lookup failed, continue without
        }
      }

      // 3. Basic compliance check (screen the product name for export controls)
      let complianceStatus: "clear" | "review" | "error" = "clear";
      let complianceNote = "No restrictions found";

      try {
        const screening = await screenEntity(product.name);
        if (screening.matches.length > 0 && screening.matches[0].score > 80) {
          complianceStatus = "review";
          complianceNote = `Potential match on ${screening.listsChecked.join(", ")}. Manual review recommended.`;
        }
      } catch {
        complianceStatus = "error";
        complianceNote = "Screening unavailable";
      }

      results.push({
        name: product.name,
        description: product.description,
        sku: product.sku,
        hsCode,
        hsDescription,
        dutyRate,
        ftaPrograms,
        topMarkets,
        complianceStatus,
        complianceNote,
      });
    }

    // Build markdown summary
    const summary = buildSummary(results);

    return NextResponse.json({
      products: results,
      summary,
      totalProcessed: results.length,
      totalSubmitted: products.length,
    });
  } catch (error) {
    console.error("Catalog processing error:", error);
    return NextResponse.json(
      { error: "Failed to process catalog" },
      { status: 500 }
    );
  }
}

function buildSummary(products: ProcessedProduct[]): string {
  const classified = products.filter((p) => p.hsCode).length;
  const withMarkets = products.filter((p) => p.topMarkets.length > 0).length;
  const flagged = products.filter((p) => p.complianceStatus === "review").length;

  let md = `## Catalog Analysis Complete\n\n`;
  md += `**${products.length}** products processed | **${classified}** classified | **${flagged}** flagged for review\n\n`;
  md += `| Product | HS Code | Duty | Top Market | Status |\n`;
  md += `|---------|---------|------|------------|--------|\n`;

  for (const p of products) {
    const status = p.complianceStatus === "clear" ? "Clear" : "Review";
    const market = p.topMarkets[0]?.country ?? "N/A";
    md += `| ${p.name} | ${p.hsCode ?? "N/A"} | ${p.dutyRate ?? "N/A"} | ${market} | ${status} |\n`;
  }

  if (flagged > 0) {
    md += `\n### Flagged for Review\n`;
    products
      .filter((p) => p.complianceStatus === "review")
      .forEach((p) => {
        md += `- **${p.name}**: ${p.complianceNote}\n`;
      });
  }

  const allFTA = [...new Set(products.flatMap((p) => p.ftaPrograms))];
  if (allFTA.length > 0) {
    md += `\n### FTA Eligibility\n`;
    md += `Your products may qualify for reduced duties under: **${allFTA.join(", ")}**\n`;
  }

  return md;
}
