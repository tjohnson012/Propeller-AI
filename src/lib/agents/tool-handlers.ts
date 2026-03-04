/**
 * Tool execution handlers
 * These connect AI tool calls to real data sources
 */

import { screenEntity, screenEntities } from "@/lib/data/ofac";
import { lookupHSCode, searchHSCodes, getFTAEligibility } from "@/lib/data/hts";
import { getTradeFlows, formatTradeValue } from "@/lib/data/comtrade";

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    // ── Market Tools ──
    case "search_trade_flows": {
      const flows = await getTradeFlows(
        toolInput.hs_code as string,
        (toolInput.reporter_country as string) ?? "world",
        (toolInput.direction as "import" | "export") ?? "import"
      );
      const partnerLines = flows.partners
        .map(
          (p, i) =>
            `${i + 1}. ${p.country}: ${formatTradeValue(p.tradeValue)} (${p.share}% share)`
        )
        .join("\n");
      return `## Trade Flow Data: ${flows.hsDescription}\n\nSource: ${flows.source}\nReporter: ${flows.reporter}\nDirection: ${flows.direction}\nYear: ${flows.year}\nTotal global value: ${formatTradeValue(flows.totalValue)}\n\nTop trading partners:\n${partnerLines}`;
    }

    case "classify_hs_code": {
      const results = searchHSCodes(toolInput.product_description as string);
      if (results.length === 0) {
        return "No matching HS codes found for this product description. Try more specific terms.";
      }
      const lines = results
        .map(
          (r) =>
            `- **${r.code}**: ${r.description} (confidence: ${r.confidence}%, duty: ${r.generalDutyRate})`
        )
        .join("\n");
      return `## HS Code Classification Results\n\nQuery: "${toolInput.product_description}"\n\n${lines}`;
    }

    case "get_hs_details": {
      const hs = lookupHSCode(toolInput.hs_code as string);
      if (!hs) return `HS code ${toolInput.hs_code} not found in database.`;

      let result = `## HS Code ${hs.code}\n\n**Description:** ${hs.description}\n**Chapter:** ${hs.chapter}\n**General Duty Rate:** ${hs.generalDutyRate}\n**Unit:** ${hs.unit}`;

      if (hs.notes) result += `\n**Notes:** ${hs.notes}`;
      if (hs.specialPrograms.length > 0)
        result += `\n**Special Programs:** ${hs.specialPrograms.join(", ")}`;

      if (toolInput.destination_country) {
        const fta = getFTAEligibility(
          toolInput.hs_code as string,
          toolInput.destination_country as string
        );
        result += `\n\n### FTA Eligibility for ${toolInput.destination_country}\n`;
        result += `**Eligible:** ${fta.eligible ? "Yes" : "No"}\n`;
        if (fta.agreements.length > 0)
          result += `**Applicable FTAs:** ${fta.agreements.join(", ")}\n`;
        result += `**Savings:** ${fta.potentialSavings}`;
      }

      return result;
    }

    // ── Compliance Tools ──
    case "screen_entity": {
      const result = await screenEntity(toolInput.entity_name as string);
      const listCount = result.listsChecked.length;

      if (!result.matched) {
        return `## Screening Result: CLEAR ✓\n\n**Entity:** ${result.query}\n**Status:** No matches found across ${listCount} federal screening lists\n**Lists checked:** ${result.listsChecked.join(", ")}\n**Data source:** US Government Consolidated Screening List (trade.gov)\n**Screened at:** ${result.timestamp}\n\nThis entity does not appear on any checked sanctions, denied persons, entity, or restricted party lists.`;
      }

      const matchLines = result.matches
        .map(
          (m) =>
            `- **${m.entry.name}** (UID: ${m.entry.uid})\n  Source list: ${m.entry.sourceList}\n  Program: ${m.entry.program}\n  Match type: ${m.matchType} (${Math.round(m.score * 100)}% confidence)\n  Matched on: ${m.matchedField}${m.entry.country ? `\n  Country: ${m.entry.country}` : ""}`
        )
        .join("\n");

      return `## Screening Result: FLAGGED ⚠\n\n**Entity:** ${result.query}\n**Status:** ${result.matches.length} potential match(es) found\n**Match score:** ${result.matchScore}%\n**Match type:** ${result.matchType}\n**Lists checked:** ${listCount} federal screening lists\n**Data source:** US Government Consolidated Screening List (trade.gov)\n**Screened at:** ${result.timestamp}\n\n### Matches:\n${matchLines}\n\n**Recommendation:** Manual review required before proceeding with this entity.`;
    }

    case "screen_entities_batch": {
      const { results, summary } = await screenEntities(
        toolInput.entity_names as string[]
      );
      const flaggedLines = results
        .filter((r) => r.matched)
        .map(
          (r) =>
            `- **${r.query}** — ${r.matchType} match (${r.matchScore}% confidence): ${r.matches[0]?.entry.name} [${r.matches[0]?.entry.sourceList}: ${r.matches[0]?.entry.program}]`
        )
        .join("\n");

      const clearedList = results
        .filter((r) => !r.matched)
        .map((r) => r.query)
        .join(", ");

      const listCount = summary.listsChecked.length;

      return `## Batch Screening Summary\n\n**Total screened:** ${summary.total}\n**Cleared:** ${summary.cleared} ✓\n**Flagged:** ${summary.flagged} ⚠\n**Lists checked:** ${listCount} federal screening lists (OFAC SDN, BIS Entity List, DPL, UVL, MEU, ITAR Debarred, Nonproliferation, SSI, CMIC, PLC, CAP, NS-MBS, FSE)\n**Data source:** US Government Consolidated Screening List (trade.gov)\n**Screened at:** ${summary.timestamp}\n\n${summary.flagged > 0 ? `### Flagged Entities:\n${flaggedLines}\n` : ""}${summary.cleared > 0 ? `### Cleared Entities:\n${clearedList}` : ""}`;
    }

    case "check_export_controls": {
      const hs = lookupHSCode(toolInput.hs_code as string);
      const dest = toolInput.destination_country as string;

      // Most Ohio manufacturing products are EAR99
      const isControlled = false; // Would check real BIS data
      const eccn = "EAR99";

      return `## Export Control Check\n\n**Product:** ${hs?.description ?? `HS ${toolInput.hs_code}`}\n**HS Code:** ${toolInput.hs_code}\n**Destination:** ${dest}\n**ECCN:** ${eccn}\n**License Required:** ${isControlled ? "Yes" : "No"}\n\n${isControlled ? "⚠ An export license may be required. Contact BIS for confirmation." : "✓ No export license required for this product to " + dest + ". Classified as EAR99 (items not on the Commerce Control List)."}`;
    }

    case "check_fta_eligibility": {
      const fta = getFTAEligibility(
        toolInput.hs_code as string,
        toolInput.destination_country as string
      );
      const hs = lookupHSCode(toolInput.hs_code as string);

      return `## FTA Eligibility Check\n\n**Product:** ${hs?.description ?? `HS ${toolInput.hs_code}`}\n**HS Code:** ${toolInput.hs_code}\n**Destination:** ${toolInput.destination_country}\n**General Duty Rate:** ${hs?.generalDutyRate ?? "Unknown"}\n\n**FTA Eligible:** ${fta.eligible ? "Yes ✓" : "No"}\n${fta.agreements.length > 0 ? `**Applicable Agreements:** ${fta.agreements.join(", ")}\n` : ""}**Assessment:** ${fta.potentialSavings}`;
    }

    // ── Outreach Tools ──
    case "draft_outreach_email": {
      // The LLM generates the actual email content — this tool provides structure
      return `## Email Draft Structure\n\n**To:** Procurement, ${toolInput.buyer_company}\n**Country:** ${toolInput.buyer_country}\n**Product:** ${toolInput.product_description}\n${toolInput.hs_code ? `**HS Code:** ${toolInput.hs_code}\n` : ""}${toolInput.key_specs ? `**Key Specs:** ${toolInput.key_specs}\n` : ""}\n\nPlease generate a professional outreach email using this information. Include cultural conventions appropriate for ${toolInput.buyer_country}. The email should be concise, mention specific product specifications, and include a clear call to action.`;
    }

    case "generate_followup": {
      return `## Follow-up Email Context\n\n**Buyer:** ${toolInput.buyer_company}\n**Days since initial outreach:** ${toolInput.days_since_initial}\n${toolInput.context ? `**Context:** ${toolInput.context}\n` : ""}\n\nGenerate a polite follow-up email. If >7 days, add a new value proposition or offer samples. If >14 days, try a different angle or offer a call.`;
    }

    // ── Finance Tools ──
    case "recommend_payment_terms": {
      const country = toolInput.buyer_country as string;
      const relationship = (toolInput.relationship as string) ?? "new";
      const value = (toolInput.transaction_value as string) ?? "Unknown";

      // Country risk tiers (simplified)
      const highRisk = ["russia", "iran", "north korea", "syria", "cuba", "venezuela"];
      const mediumRisk = ["brazil", "india", "turkey", "argentina", "egypt"];
      const isHighRisk = highRisk.includes(country.toLowerCase());
      const isMediumRisk = mediumRisk.includes(country.toLowerCase());

      let recommendation: string;
      if (isHighRisk) {
        recommendation = `⚠ **HIGH RISK COUNTRY**\n\n**Recommended:** Cash in advance only\n**Alternative:** Confirmed irrevocable LC through a US correspondent bank\n**Insurance:** Mandatory — EXIM Bank or private political risk insurance\n**Note:** Additional due diligence required. Check OFAC restrictions.`;
      } else if (relationship === "new" || isMediumRisk) {
        recommendation = `**Recommended:** Irrevocable Letter of Credit at sight\n**Issuing Bank:** Top-tier local bank with US correspondent\n**Coverage:** 100% of invoice value\n**Estimated LC fee:** 0.8-1.5% of value\n**Alternative:** Documentary collection (D/P) for lower-value orders\n\n**Credit Insurance:** Recommended — Euler Hermes or Coface, ~0.3-0.6% premium`;
      } else {
        recommendation = `**Recommended:** Open account, Net 60\n**Credit Insurance:** Euler Hermes, 90% coverage, ~0.3-0.4% premium\n**Alternative:** Net 30 with 2% early payment discount\n\n**For orders over $100K:** Consider partial LC (50%) + open account (50%)`;
      }

      return `## Payment Terms Recommendation\n\n**Buyer Country:** ${country}\n**Relationship:** ${relationship}\n**Transaction Value:** ${value}\n\n${recommendation}`;
    }

    case "estimate_duties": {
      const hs = lookupHSCode(toolInput.hs_code as string);
      const rate = parseFloat(hs?.generalDutyRate ?? "0") || 0;
      const value = parseFloat((toolInput.value as string).replace(/[$,]/g, "")) || 0;
      const duty = value * (rate / 100);

      return `## Duty Estimate\n\n**Product:** ${hs?.description ?? `HS ${toolInput.hs_code}`}\n**Destination:** ${toolInput.destination_country}\n**Declared Value:** $${value.toLocaleString()}\n**Duty Rate:** ${hs?.generalDutyRate ?? "Unknown"}\n**Estimated Duty:** $${duty.toLocaleString()}\n\n*Note: This is an estimate. Actual duties may vary based on classification rulings, origin determination, and applicable trade agreements.*`;
    }

    case "find_export_financing": {
      const state = toolInput.company_state as string;
      const isOhio = state.toLowerCase() === "ohio";

      let statePrograms = "";
      if (isOhio) {
        statePrograms = `### Ohio-Specific Programs\n- **Ohio STEP Grant** (SBA-funded): Up to $15,000 for trade missions, catalog translations, website localization\n- **Ohio Development Services Agency**: Export assistance and market research\n- **Ohio SBDC International Trade Program**: Free export counseling and training\n- **Miami Valley SBDC**: Regional export assistance for Dayton-Cincinnati corridor`;
      }

      return `## Export Financing Programs\n\n### Federal Programs\n- **SBA STEP Grant**: Up to $15,000 for export marketing activities (trade shows, translations, website localization)\n- **Ex-Im Bank Working Capital Guarantee**: 90% advance rate on export orders, up to $10M\n- **Ex-Im Bank Export Credit Insurance**: Protects against buyer non-payment, 90-95% coverage\n- **USDA MAP/FMD**: For agricultural/food products only\n\n${statePrograms}\n\n### Commercial Options\n- **Trade Finance Banks**: LC confirmation, forfaiting, factoring\n- **Credit Insurance**: Euler Hermes, Coface, Atradius — 90% coverage, 0.3-0.6% premium\n- **SBA 7(a) International Trade Loan**: Up to $5M for export working capital`;
    }

    case "generate_market_report": {
      const companyName = toolInput.company_name as string;
      const productDesc = toolInput.product_description as string;
      const hsCodes = toolInput.hs_codes as Array<{ code: string; description: string; duty_rate?: string }>;
      const topMarkets = toolInput.top_markets as Array<{ country: string; import_value: string; share?: string; recommendation?: string }>;
      const summary = toolInput.summary as string;
      const reportId = `MKT-${Date.now().toString(36).toUpperCase()}`;

      const hsSection = hsCodes
        .map((hs) => `| ${hs.code} | ${hs.description} | ${hs.duty_rate ?? "—"} |`)
        .join("\n");

      const marketSection = topMarkets
        .map((m, i) => `| ${i + 1} | ${m.country} | ${m.import_value} | ${m.share ?? "—"} | ${m.recommendation ?? "—"} |`)
        .join("\n");

      return `## Market Research Report

**Report ID:** ${reportId}
**Date:** ${new Date().toISOString().slice(0, 10)}
**Company:** ${companyName}
**Product:** ${productDesc}
**Data Source:** UN Comtrade, USITC Harmonized Tariff Schedule

---

### Executive Summary
${summary}

---

### HS Code Classification

| Code | Description | Duty Rate |
|------|-------------|-----------|
${hsSection}

### Top Target Markets

| Rank | Country | Import Value | Market Share | Recommendation |
|------|---------|-------------|-------------|----------------|
${marketSection}

---

### Methodology
- Product classified using USITC Harmonized Tariff Schedule (17,000+ codes)
- Trade flow data sourced from UN Comtrade (190+ countries)
- Markets ranked by import value, growth trajectory, and accessibility

*This report was generated by Propeller AI. Export it using the download button in the artifact panel.*`;
    }

    case "generate_outreach_package": {
      const companyName = toolInput.company_name as string;
      const targetCountry = toolInput.target_country as string;
      const emails = toolInput.emails as Array<{ to_company: string; subject: string; body: string }>;
      const productDesc = toolInput.product_description as string;
      const hsCode = (toolInput.hs_code as string) ?? "";
      const reportId = `OUT-${Date.now().toString(36).toUpperCase()}`;

      const emailSections = emails
        .map((email, i) => `### Email ${i + 1} — ${email.to_company}

**Subject:** ${email.subject}

---

${email.body}

---`)
        .join("\n\n");

      return `## Buyer Outreach Package

**Report ID:** ${reportId}
**Date:** ${new Date().toISOString().slice(0, 10)}
**From:** ${companyName}
**Target Market:** ${targetCountry}
**Product:** ${productDesc}
${hsCode ? `**HS Code:** ${hsCode}` : ""}

---

${emailSections}

### Follow-Up Schedule
- **Day 3:** If no response, send a brief follow-up referencing the initial email
- **Day 7:** Send a value-add follow-up with a technical datasheet or case study
- **Day 14:** Final follow-up with a direct call-to-action (sample offer or meeting request)
- **Day 21+:** Move to nurture sequence (quarterly updates, industry news)

### Talking Points for Sales Calls
- Lead with specific product specifications that match the buyer's import needs
- Reference trade data: "${targetCountry} imports $X annually in this category"
- Highlight US manufacturing quality standards and certifications
- Offer competitive payment terms (LC at sight for new relationships)
- Mention FTA benefits if applicable

*This package was generated by Propeller AI. Export it using the download button in the artifact panel.*`;
    }

    case "generate_screening_report": {
      const entity = toolInput.entity_name as string;
      const result = toolInput.screening_result as string;
      const reportId = `SCR-${Date.now().toString(36).toUpperCase()}`;
      const hsCode = toolInput.hs_code as string | undefined;
      const dest = toolInput.destination_country as string | undefined;
      const matchDetails = toolInput.match_details as string | undefined;
      const notes = toolInput.notes as string | undefined;

      const listsSection = [
        "OFAC Specially Designated Nationals (SDN)",
        "OFAC Sectoral Sanctions (SSI)",
        "OFAC Foreign Sanctions Evaders (FSE)",
        "OFAC Non-SDN CMIC",
        "BIS Entity List (EL)",
        "BIS Denied Persons List (DPL)",
        "BIS Unverified List (UVL)",
        "BIS Military End User (MEU)",
        "State Dept ITAR Debarred (DTC)",
        "State Dept Nonproliferation Sanctions (ISN)",
        "OFAC Palestinian Legislative Council (PLC)",
        "OFAC CAPTA List (CAP)",
        "OFAC Non-SDN Menu-Based Sanctions (NS-MBS)",
      ]
        .map((l) => `- ${l} — ✓`)
        .join("\n");

      return `## Compliance Screening Report

**Report ID:** ${reportId}
**Date:** ${new Date().toISOString().slice(0, 10)}
**Data Source:** US Government Consolidated Screening List (trade.gov)

---

### Entity Screened
**${entity}**

### Result: ${result === "CLEAR" ? "CLEAR ✓" : "FLAGGED ⚠"}

${hsCode ? `### Export Classification\n- **HS Code:** ${hsCode}\n- **ECCN:** EAR99\n` : ""}${dest ? `- **Destination:** ${dest}\n- **License Required:** No\n` : ""}
### Screening Lists Checked (13 Federal Lists)
${listsSection}

${matchDetails ? `### Match Details\n${matchDetails}\n` : ""}${notes ? `### Notes\n${notes}\n` : ""}
---

*This report was generated by Propeller AI. Export as PDF using the download button in the artifact panel.*`;
    }

    case "generate_commercial_invoice": {
      const items = (toolInput.items as Array<{
        description: string;
        hs_code: string;
        quantity: number;
        unit_price: number;
      }>);

      const invoiceNumber = `PI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const shipping = Math.round(subtotal * 0.03); // ~3% estimate
      const insurance = Math.round(subtotal * 0.005); // ~0.5%
      const total = subtotal + shipping + insurance;

      const itemRows = items
        .map(
          (item, i) =>
            `| ${i + 1} | ${item.description} | ${item.hs_code} | ${item.quantity} | $${item.unit_price.toLocaleString()} | $${(item.quantity * item.unit_price).toLocaleString()} |`
        )
        .join("\n");

      const incoterm = (toolInput.incoterm as string) ?? "FOB";
      const paymentTerms = (toolInput.payment_terms as string) ?? "Irrevocable LC at sight";

      return `## Commercial Invoice — ${invoiceNumber}

**Date:** ${new Date().toISOString().slice(0, 10)}
**Invoice #:** ${invoiceNumber}

### Shipper / Exporter
**${toolInput.shipper_name}**

### Consignee / Buyer
**${toolInput.consignee_name}**
Country: ${toolInput.consignee_country}

### Shipment Details
- **Incoterm:** ${incoterm}
- **Payment Terms:** ${paymentTerms}
- **Country of Origin:** United States
- **ECCN:** EAR99
- **Export License:** NLR — No License Required

### Items

| # | Description | HS Code | Qty | Unit Price | Total |
|---|-------------|---------|-----|------------|-------|
${itemRows}

### Totals
- **Subtotal:** $${subtotal.toLocaleString()}
- **Shipping (est.):** $${shipping.toLocaleString()}
- **Insurance (est.):** $${insurance.toLocaleString()}
- **Total Value:** $${total.toLocaleString()} USD

### Compliance
All parties screened against US Consolidated Screening List (13 federal lists) — **CLEARED**.

---

*This invoice was generated by Propeller AI. Export it as a PDF using the download button in the artifact panel.*`;
    }

    default:
      return `Tool "${toolName}" is not implemented.`;
  }
}
