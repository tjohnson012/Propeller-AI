import { NextRequest, NextResponse } from "next/server";
import { searchHSCodes, lookupHSCode } from "@/lib/data/hts";
import { screenEntity } from "@/lib/data/ofac";

/**
 * QuickBooks integration.
 * Syncs with QB to:
 * - Import product inventory for classification
 * - Screen customers/vendors against OFAC
 * - Add HS codes and duty rates to items
 * - Generate export invoices with required trade fields
 *
 * In production, this would use the QuickBooks Online API (OAuth2).
 * For now, it accepts the same data shapes QB would provide.
 */
export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case "sync-inventory": {
        // QB sends inventory items → we classify them
        const items = data?.items as Array<{ name: string; description: string; sku: string }> || [];

        const classified = items.map((item) => {
          const matches = searchHSCodes(item.description || item.name);
          const best = matches[0];
          const fullHS = best ? lookupHSCode(best.code) : null;

          return {
            qb_name: item.name,
            qb_sku: item.sku,
            hs_code: best?.code ?? null,
            hs_description: best?.description ?? null,
            duty_rate: best?.generalDutyRate ?? null,
            fta_eligible: fullHS?.specialPrograms ?? [],
            classification_confidence: best ? "high" : "low",
          };
        });

        return NextResponse.json({
          action: "sync-inventory",
          items: classified,
          classified_count: classified.filter((c) => c.hs_code).length,
          total: classified.length,
        });
      }

      case "screen-customers": {
        // Screen QB customers against OFAC
        const customers = data?.customers as Array<{ name: string; id: string }> || [];

        const results = await Promise.all(
          customers.slice(0, 50).map(async (customer) => {
            try {
              const result = await screenEntity(customer.name);
              const flagged = result.matches.length > 0 && result.matches[0].score > 80;
              return {
                qb_id: customer.id,
                name: customer.name,
                ofac_status: flagged ? "FLAGGED" : "CLEAR",
                match_score: result.matches[0]?.score ?? 0,
                action_required: flagged,
              };
            } catch {
              return {
                qb_id: customer.id,
                name: customer.name,
                ofac_status: "ERROR",
                match_score: 0,
                action_required: false,
              };
            }
          })
        );

        const flaggedCount = results.filter((r) => r.ofac_status === "FLAGGED").length;

        return NextResponse.json({
          action: "screen-customers",
          results,
          total: results.length,
          flagged: flaggedCount,
          clear: results.length - flaggedCount,
        });
      }

      case "export-invoice-fields": {
        // Generate required export document fields for a QB invoice
        const invoice = data?.invoice as {
          customer_name: string;
          customer_country: string;
          items: Array<{ name: string; quantity: number; amount: number }>;
        };

        if (!invoice) {
          return NextResponse.json({ error: "Invoice data required" }, { status: 400 });
        }

        // Screen the customer
        const screening = await screenEntity(invoice.customer_name);
        const flagged = screening.matches.length > 0 && screening.matches[0].score > 80;

        // Classify items
        const classifiedItems = invoice.items.map((item) => {
          const matches = searchHSCodes(item.name);
          const best = matches[0];
          return {
            ...item,
            hs_code: best?.code ?? "CLASSIFY MANUALLY",
            schedule_b: best?.code ?? "CLASSIFY MANUALLY",
            duty_rate: best?.generalDutyRate ?? "N/A",
          };
        });

        return NextResponse.json({
          action: "export-invoice-fields",
          customer_screening: {
            status: flagged ? "FLAGGED" : "CLEAR",
            can_proceed: !flagged,
          },
          export_fields: {
            ultimate_consignee: invoice.customer_name,
            country_of_destination: invoice.customer_country,
            export_date: new Date().toISOString().split("T")[0],
            items: classifiedItems,
            total_value: invoice.items.reduce((sum, i) => sum + i.amount, 0),
            currency: "USD",
            incoterm: "FOB",
            origin: "United States",
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action. Use: sync-inventory, screen-customers, or export-invoice-fields" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("QuickBooks integration error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
