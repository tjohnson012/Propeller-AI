/**
 * Deterministic Pipeline Runner v2
 *
 * Data-first, source-cited pipeline:
 *   1. HS classification — local DB + CBP CROSS binding rulings
 *   2. Trade flows — UN Comtrade API
 *   3. Compliance screening — Consolidated Screening List (25,000+ entities)
 *   4. End-use risk assessment — BIS red flags, dual-use, destination risk
 *   5. Export controls — deterministic ECCN/FTA lookup
 *   6. Country intelligence — Trade.gov Country Commercial Guides
 *   7. Trade events — upcoming shows for this product/market
 *   8. LLM synthesis — ONE Claude call with all source data as context
 *   9. Reports — all source-cited
 *
 * Every claim is cited to its source. LLM analysis is explicitly labeled.
 */

import { searchHSCodes } from "@/lib/data/hts";
import { getTradeFlows, formatTradeValue } from "@/lib/data/comtrade";
import { screenEntity, loadSDNList } from "@/lib/data/ofac";
import { searchCrossRulings, formatRulingsForReport } from "@/lib/data/cross-rulings";
import { getCountryGuide, getGuideContextForPipeline, formatGuideForReport } from "@/lib/data/country-guides";
import { getTradeEvents, getMajorTradeShows, formatTradeEventsForReport } from "@/lib/data/trade-events";
import { assessEndUseRisk, formatEndUseForReport } from "@/lib/data/end-use-screening";
import { getAnthropicClient, MODEL } from "@/lib/ai/client";
import type { PipelineInput, PipelineEvent } from "./types";
import type { HSCodeSuggestion } from "@/lib/data/hts";
import type { TradePartner } from "@/lib/data/comtrade";
import type { CrossRuling } from "@/lib/data/cross-rulings";
import type { CountryGuide } from "@/lib/data/country-guides";
import type { TradeEvent } from "@/lib/data/trade-events";
import type { EndUseRiskAssessment } from "@/lib/data/end-use-screening";

type Emit = (event: PipelineEvent) => void;

export async function runPipeline(
  input: PipelineInput,
  emit: Emit,
): Promise<void> {
  const { companyName, product, targetCountries } = input;
  const timestamp = new Date().toISOString().slice(0, 10);

  // ────────────────────────────────────────────
  // STEP 1: HS Code Classification + CBP Rulings
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "classify", label: "Classifying product against USITC HTS database...", progress: 5 });

  const hsCodes = searchHSCodes(product).slice(0, 3);

  if (hsCodes.length === 0) {
    const words = product.split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      const retry = searchHSCodes(word);
      if (retry.length > 0) {
        hsCodes.push(...retry.slice(0, 2));
        break;
      }
    }
  }

  // Fetch CBP CROSS binding rulings in parallel
  let crossRulings: CrossRuling[] = [];
  try {
    const searchTerms = hsCodes.length > 0 ? hsCodes[0].code : product;
    crossRulings = await searchCrossRulings(searchTerms, 3);
  } catch {
    // CROSS API optional
  }

  emit({
    type: "step-done",
    step: "classify",
    label: `Found ${hsCodes.length} HS codes + ${crossRulings.length} CBP rulings`,
    progress: 12,
  });

  // Classification message with sources
  let hsMsg = `**HS Code Classification**\n`;
  hsMsg += `*Source: [USITC Harmonized Tariff Schedule](https://hts.usitc.gov/)*\n\n`;
  if (hsCodes.length > 0) {
    hsMsg += hsCodes.map((hs, i) =>
      `${i + 1}. **${hs.code}** — ${hs.description} (${hs.confidence}% match, duty: ${hs.generalDutyRate})`
    ).join("\n");
  } else {
    hsMsg += "No exact HS code matches found. Using broad category codes.";
  }

  if (crossRulings.length > 0) {
    hsMsg += `\n\n**Supporting CBP Binding Rulings**\n`;
    hsMsg += `*Source: [CBP CROSS Database](https://rulings.cbp.gov) — legally binding classification decisions*\n\n`;
    crossRulings.forEach((r) => {
      hsMsg += `- **${r.rulingNumber}** (${r.rulingDate}): ${r.subject.slice(0, 150)}${r.subject.length > 150 ? "..." : ""}\n`;
      hsMsg += `  Classified under: ${r.tariffs.join(", ")} | [View ruling](${r.url})\n`;
    });
  }

  emit({ type: "message", agentId: "market", text: hsMsg });

  // ────────────────────────────────────────────
  // STEP 2: Trade Flow Analysis
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "trade", label: "Querying UN Comtrade trade flows...", progress: 15 });

  const tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number }> = [];
  const primaryHS = hsCodes[0]?.code || "7325";

  try {
    const flows = await getTradeFlows(primaryHS, "world", "import");
    tradeFlows.push({ hsCode: primaryHS, partners: flows.partners, totalValue: flows.totalValue });
  } catch {
    // Fallback handled internally
  }

  emit({
    type: "step-done",
    step: "trade",
    label: `Trade data for ${tradeFlows[0]?.partners.length || 0} countries`,
    progress: 30,
  });

  if (tradeFlows.length > 0 && tradeFlows[0].partners.length > 0) {
    const top = tradeFlows[0].partners.slice(0, 10);
    const targetData = tradeFlows[0].partners.filter((p) =>
      targetCountries.some((tc) => p.country.toLowerCase().includes(tc.toLowerCase())),
    );

    let tradeMsg = `**Global Trade Flows for HS ${primaryHS}**\n`;
    tradeMsg += `*Source: [UN Comtrade Database](https://comtradeplus.un.org/) — 2023 import data*\n\n`;
    tradeMsg += `Total global imports: ${formatTradeValue(tradeFlows[0].totalValue)}\n\n`;
    tradeMsg += `| Rank | Country | Import Value | Share |\n|------|---------|-------------|-------|\n`;
    top.forEach((p, i) => {
      const isTarget = targetCountries.some((tc) => p.country.toLowerCase().includes(tc.toLowerCase()));
      tradeMsg += `| ${i + 1} | ${isTarget ? "**" + p.country + "**" : p.country} | ${formatTradeValue(p.tradeValue)} | ${p.share}% |\n`;
    });

    if (targetData.length > 0) {
      tradeMsg += `\n**Your target markets:**\n`;
      targetData.forEach((p) => {
        tradeMsg += `- **${p.country}**: ${formatTradeValue(p.tradeValue)} imports (${p.share}% global share)\n`;
      });
    }

    emit({
      type: "message",
      agentId: "market",
      text: tradeMsg,
      artifact: { type: "table", title: "Trade Flow Analysis", content: tradeMsg },
    });
  }

  // ────────────────────────────────────────────
  // STEP 3: Compliance Screening
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "screen", label: "Screening against Consolidated Screening List...", progress: 35 });

  await loadSDNList();
  const screeningResult = await screenEntity(companyName);
  const matchCount = screeningResult.matches.length;
  const listsCount = screeningResult.listsChecked.length;

  emit({
    type: "step-done",
    step: "screen",
    label: matchCount > 0 ? "FLAGGED — matches found" : "CLEAR — no matches",
    progress: 45,
  });

  let screenMsg = matchCount > 0
    ? `**Compliance Screening: FLAGGED**\n\n`
    : `**Compliance Screening: CLEAR**\n\n`;
  screenMsg += `*Source: [U.S. Consolidated Screening List](https://www.trade.gov/consolidated-screening-list) — ${listsCount} federal lists, 25,000+ entities*\n\n`;

  if (matchCount > 0) {
    screenMsg += `⚠️ ${matchCount} potential match(es) for "${companyName}":\n\n`;
    screenMsg += screeningResult.matches.slice(0, 5).map((m) =>
      `- **${m.entry.name}** (${Math.round(m.score * 100)}% match) — ${m.entry.sourceList}`
    ).join("\n");
    screenMsg += `\n\n*Manual review recommended before proceeding.*`;
  } else {
    screenMsg += `✓ "${companyName}" — no matches found.\n\n`;
    screenMsg += `Lists checked: OFAC SDN, BIS Entity List, BIS Denied Persons, BIS Unverified, ITAR Debarred, and ${listsCount - 5} additional federal lists.`;
  }

  emit({ type: "message", agentId: "compliance", text: screenMsg });

  // ────────────────────────────────────────────
  // STEP 4: End-Use Risk Assessment
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "controls", label: "Assessing end-use risk and export controls...", progress: 50 });

  const primaryCountry = targetCountries[0] || "Canada";
  const exportControls = getExportControlInfo(primaryHS, primaryCountry);
  const ftaInfo = getFTAInfo(primaryHS, primaryCountry);

  // End-use risk assessment
  const endUseAssessment = assessEndUseRisk({
    hsCode: primaryHS,
    product,
    destinationCountry: primaryCountry,
    buyerName: companyName,
  });

  emit({ type: "step-done", step: "controls", label: "Export controls and end-use assessment complete", progress: 58 });

  let controlsMsg = `**Export Controls & End-Use Assessment**\n\n`;
  controlsMsg += `*Sources: [BIS Export Administration Regulations](https://www.bis.doc.gov/), [BIS Country Chart](https://www.bis.doc.gov/index.php/regulations/commerce-control-list-ccl)*\n\n`;
  controlsMsg += `- **HS Code:** ${primaryHS}\n`;
  controlsMsg += `- **ECCN:** ${exportControls.eccn}\n`;
  controlsMsg += `- **License Required:** ${exportControls.licenseRequired ? "Yes" : "No — EAR99 (no license needed)"}\n`;
  controlsMsg += `- **Destination:** ${primaryCountry}\n`;
  controlsMsg += `- **End-Use Risk Level:** ${endUseAssessment.riskLevel.toUpperCase()}\n`;
  controlsMsg += `- **FTA Eligible:** ${ftaInfo.eligible ? `Yes — ${ftaInfo.agreement}` : "No applicable FTA"}\n`;
  if (ftaInfo.eligible) controlsMsg += `- **Potential Duty Savings:** ${ftaInfo.savings}\n`;
  if (endUseAssessment.flags.length > 0) {
    controlsMsg += `\n**Risk Indicators:**\n`;
    endUseAssessment.flags.forEach((f) => {
      controlsMsg += `- [${f.severity.toUpperCase()}] ${f.description}\n  *Source: ${f.source}*\n`;
    });
  }
  controlsMsg += `\n**Recommendation:** ${endUseAssessment.recommendation}`;

  emit({ type: "message", agentId: "compliance", text: controlsMsg });

  // ────────────────────────────────────────────
  // STEP 5: Country Intelligence + Trade Events (parallel)
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "synthesize", label: "Loading country intelligence from Trade.gov...", progress: 60 });

  // Fetch country guide and trade events in parallel
  const [countryGuide, tradeEvents, curatedShows] = await Promise.all([
    getCountryGuide(primaryCountry).catch(() => null),
    getTradeEvents({ countries: targetCountries, industries: [product] }).catch(() => []),
    Promise.resolve(getMajorTradeShows(product, targetCountries)),
  ]);

  // Merge and deduplicate events
  const allEvents: TradeEvent[] = [];
  const seenNames = new Set<string>();
  for (const event of [...tradeEvents, ...curatedShows]) {
    const key = event.name.toLowerCase().slice(0, 30);
    if (!seenNames.has(key)) {
      seenNames.add(key);
      allEvents.push(event);
    }
  }

  // Emit trade events message
  if (allEvents.length > 0) {
    let eventsMsg = `**Upcoming Trade Events**\n\n`;
    allEvents.slice(0, 6).forEach((event) => {
      eventsMsg += `- **${event.name}** — ${event.startDate}${event.endDate ? ` to ${event.endDate}` : ""}\n`;
      eventsMsg += `  ${event.location} | [Details](${event.url})\n`;
      eventsMsg += `  *Source: ${event.source}*\n`;
    });
    emit({ type: "message", agentId: "outreach", text: eventsMsg });
  }

  // ────────────────────────────────────────────
  // STEP 6: LLM Synthesis (ONE call with full context)
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "synthesize", label: "Generating executive analysis...", progress: 70 });

  let synthesisText = "";
  try {
    synthesisText = await synthesizeFindings({
      companyName,
      product,
      targetCountries,
      hsCodes,
      tradeFlows,
      screening: { status: matchCount > 0 ? "FLAGGED" : "CLEAR", details: screenMsg },
      exportControls,
      ftaInfo,
      endUseAssessment,
      countryGuide,
      crossRulings,
      tradeEvents: allEvents,
    });
  } catch {
    synthesisText = getTemplateSynthesis(companyName, product, targetCountries, hsCodes, tradeFlows, primaryCountry);
  }

  emit({ type: "step-done", step: "synthesize", label: "Analysis complete", progress: 80 });

  // ────────────────────────────────────────────
  // STEP 7: Outreach Package
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "outreach", label: "Drafting outreach package...", progress: 82 });

  const outreachPackage = generateOutreachPackage(companyName, product, primaryHS, primaryCountry, targetCountries, allEvents, countryGuide);

  emit({ type: "step-done", step: "outreach", label: "Outreach emails drafted", progress: 87 });

  emit({
    type: "message",
    agentId: "outreach",
    text: `**Buyer Outreach**\n\nDrafted outreach emails for ${primaryCountry} buyers with country-specific formality and cultural notes${countryGuide ? " from the Trade.gov Country Commercial Guide" : ""}. Includes follow-up schedule and talking points.\n\nView the full package in the artifact panel.`,
  });

  // ────────────────────────────────────────────
  // STEP 8: Finance Report
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "finance", label: "Preparing financial analysis...", progress: 88 });

  const financeReport = generateFinanceReport(companyName, product, primaryHS, primaryCountry, targetCountries, ftaInfo, hsCodes);

  emit({ type: "step-done", step: "finance", label: "Financial analysis complete", progress: 92 });

  emit({
    type: "message",
    agentId: "finance",
    text: `**Export Finance**\n\n- **Recommended Payment Terms:** Letter of Credit at sight for new ${primaryCountry} buyers\n- **Estimated Duty Rate:** ${hsCodes[0]?.generalDutyRate || "2.9%"}\n- **FTA Status:** ${ftaInfo.eligible ? ftaInfo.agreement : "No applicable FTA"}\n\n*Sources: [SBA STEP Program](https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step), [Ex-Im Bank](https://www.exim.gov/)*\n\nView the full financial analysis in the artifact panel.`,
  });

  // ────────────────────────────────────────────
  // STEP 9: Generate All Reports
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "reports", label: "Generating final reports...", progress: 93 });

  const marketReport = generateMarketReport(companyName, product, hsCodes, tradeFlows, targetCountries, synthesisText, crossRulings, countryGuide, allEvents);
  const complianceReport = generateComplianceReport(
    companyName,
    { matchCount, listsChecked: listsCount, topMatches: screeningResult.matches.slice(0, 5).map((m) => ({ name: m.entry.name, score: Math.round(m.score * 100), source: m.entry.sourceList })) },
    exportControls, ftaInfo, primaryHS, primaryCountry, endUseAssessment,
  );

  // Emit all artifacts
  emit({ type: "artifact", artifact: { type: "report", title: "Market Research Report", content: marketReport }, agentId: "market" });
  emit({ type: "artifact", artifact: { type: "report", title: "Compliance & End-Use Report", content: complianceReport }, agentId: "compliance" });
  emit({ type: "artifact", artifact: { type: "document", title: "Outreach Email Package", content: outreachPackage }, agentId: "outreach" });
  emit({ type: "artifact", artifact: { type: "document", title: "Export Finance Summary", content: financeReport }, agentId: "finance" });

  // Final synthesis message
  emit({
    type: "message",
    agentId: "market",
    text: synthesisText,
    artifact: { type: "report", title: "Market Research Report", content: marketReport },
  });

  emit({ type: "step-done", step: "reports", label: "All reports ready", progress: 100 });
  emit({ type: "done" });
}

/* ── Helper: Export Controls Lookup ── */
function getExportControlInfo(
  hsCode: string,
  destination: string,
): { eccn: string; licenseRequired: boolean; notes: string } {
  const clean = hsCode.replace(/[.\s]/g, "");

  if (clean.startsWith("9305") || clean.startsWith("9301") || clean.startsWith("9306")) {
    return {
      eccn: "0A501",
      licenseRequired: true,
      notes: "Defense article — may require ITAR license or BIS EAR license depending on specifications. Source: ITAR USML Category I-IV.",
    };
  }

  if (clean.startsWith("84") || clean.startsWith("73") || clean.startsWith("72")) {
    const sanctionedCountries = ["iran", "north korea", "syria", "cuba", "russia", "belarus"];
    const isSanctioned = sanctionedCountries.some((c) => destination.toLowerCase().includes(c));
    return {
      eccn: "EAR99",
      licenseRequired: isSanctioned,
      notes: isSanctioned
        ? "Sanctioned destination — license required despite EAR99 classification. Source: 15 CFR Part 746."
        : "No license required for this product category to this destination. Source: BIS EAR Part 734.",
    };
  }

  return {
    eccn: "EAR99",
    licenseRequired: false,
    notes: "General industrial goods — no specific export controls apply. Source: BIS EAR Part 734.",
  };
}

/* ── Helper: FTA Lookup ── */
function getFTAInfo(
  hsCode: string,
  destination: string,
): { eligible: boolean; agreement: string; savings: string } {
  const dest = destination.toLowerCase();
  // Source for all FTA data: USTR.gov Free Trade Agreements page
  if (dest.includes("canada") || dest.includes("mexico"))
    return { eligible: true, agreement: "USMCA (US-Mexico-Canada Agreement)", savings: "Duty-free under USMCA for qualifying goods" };
  if (dest.includes("australia"))
    return { eligible: true, agreement: "AUSFTA (Australia FTA)", savings: "Most industrial goods duty-free" };
  if (dest.includes("south korea") || dest.includes("korea"))
    return { eligible: true, agreement: "KORUS (Korea FTA)", savings: "Reduced or zero duty on most manufactured goods" };
  if (dest.includes("colombia"))
    return { eligible: true, agreement: "US-Colombia TPA", savings: "Reduced duties on industrial goods" };
  if (dest.includes("chile"))
    return { eligible: true, agreement: "US-Chile FTA", savings: "Most goods duty-free" };
  if (dest.includes("peru"))
    return { eligible: true, agreement: "US-Peru TPA", savings: "Reduced duties on industrial goods" };
  if (dest.includes("singapore"))
    return { eligible: true, agreement: "US-Singapore FTA", savings: "Most goods duty-free" };
  if (dest.includes("israel"))
    return { eligible: true, agreement: "US-Israel FTA", savings: "Duty-free on most industrial goods" };
  if (dest.includes("jordan"))
    return { eligible: true, agreement: "US-Jordan FTA", savings: "Reduced duties on qualifying goods" };
  if (dest.includes("bahrain"))
    return { eligible: true, agreement: "US-Bahrain FTA", savings: "Reduced duties on qualifying goods" };
  if (dest.includes("oman"))
    return { eligible: true, agreement: "US-Oman FTA", savings: "Reduced duties on qualifying goods" };
  if (dest.includes("morocco"))
    return { eligible: true, agreement: "US-Morocco FTA", savings: "Reduced duties on qualifying goods" };
  if (dest.includes("panama"))
    return { eligible: true, agreement: "US-Panama TPA", savings: "Reduced duties on qualifying goods" };
  if (dest.includes("dominican republic") || dest.includes("costa rica") || dest.includes("el salvador") || dest.includes("guatemala") || dest.includes("honduras") || dest.includes("nicaragua"))
    return { eligible: true, agreement: "CAFTA-DR", savings: "Reduced or zero duty on qualifying goods" };

  return { eligible: false, agreement: "", savings: "" };
}

/* ── LLM Synthesis — ONE call with full context ── */
async function synthesizeFindings(data: {
  companyName: string;
  product: string;
  targetCountries: string[];
  hsCodes: HSCodeSuggestion[];
  tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number }>;
  screening: { status: string; details: string };
  exportControls: { eccn: string; licenseRequired: boolean; notes: string };
  ftaInfo: { eligible: boolean; agreement: string; savings: string };
  endUseAssessment: EndUseRiskAssessment;
  countryGuide: CountryGuide | null;
  crossRulings: CrossRuling[];
  tradeEvents: TradeEvent[];
}): Promise<string> {
  const client = getAnthropicClient();

  const topMarkets = data.tradeFlows[0]?.partners.slice(0, 5) || [];
  const targetData = data.tradeFlows[0]?.partners.filter((p) =>
    data.targetCountries.some((tc) => p.country.toLowerCase().includes(tc.toLowerCase())),
  ) || [];

  // Build country context from Commercial Guide
  let countryContext = "";
  if (data.countryGuide) {
    const guideText = getGuideContextForPipeline(data.countryGuide, "market");
    if (guideText) {
      countryContext = `\n\nCOUNTRY INTELLIGENCE (from U.S. Trade.gov Country Commercial Guide — cite this source):\n${guideText.slice(0, 4000)}`;
    }
  }

  // Build trade events context
  let eventsContext = "";
  if (data.tradeEvents.length > 0) {
    eventsContext = `\n\nUPCOMING TRADE EVENTS (mention relevant ones in recommendations):\n`;
    data.tradeEvents.slice(0, 5).forEach((e) => {
      eventsContext += `- ${e.name} | ${e.startDate} | ${e.location} | ${e.source}\n`;
    });
  }

  // Build CBP rulings context
  let rulingsContext = "";
  if (data.crossRulings.length > 0) {
    rulingsContext = `\n\nCBP BINDING RULINGS (cite to support HS classification confidence):\n`;
    data.crossRulings.forEach((r) => {
      rulingsContext += `- ${r.rulingNumber}: ${r.subject.slice(0, 200)} | Tariffs: ${r.tariffs.join(", ")}\n`;
    });
  }

  const prompt = `You are a senior export trade advisor — not a report generator. You're briefing ${data.companyName}'s leadership on their export opportunity. Be direct, specific, and opinionated. Use "you" and "your." Don't hedge with "may" or "could" when the data supports a clear recommendation.

IMPORTANT: Every factual claim MUST cite its source in brackets. Use these formats:
- [Source: UN Comtrade 2023] for trade data
- [Source: USITC HTS] for HS codes
- [Source: U.S. Consolidated Screening List] for compliance
- [Source: Trade.gov Country Commercial Guide — {Country}] for country intelligence
- [Source: CBP Ruling {number}] for classification rulings
- [Source: BIS EAR] for export controls
- [AI Analysis] for your own conclusions and recommendations

PRODUCT: ${data.product}
HS CODES: ${data.hsCodes.map((h) => `${h.code} (${h.description})`).join(", ")}
TARGET MARKETS: ${data.targetCountries.join(", ")}

TOP GLOBAL IMPORTERS:
${topMarkets.map((p, i) => `${i + 1}. ${p.country}: ${formatTradeValue(p.tradeValue)} (${p.share}%)`).join("\n")}

TARGET MARKET DATA:
${targetData.map((p) => `- ${p.country}: ${formatTradeValue(p.tradeValue)} imports (${p.share}% share)`).join("\n") || "Limited data for target markets"}

COMPLIANCE: ${data.screening.status} | ECCN: ${data.exportControls.eccn} | License Required: ${data.exportControls.licenseRequired ? "Yes" : "No"}
END-USE RISK: ${data.endUseAssessment.riskLevel.toUpperCase()} ${data.endUseAssessment.flags.length > 0 ? "— " + data.endUseAssessment.flags.map(f => f.description).join("; ") : ""}
FTA: ${data.ftaInfo.eligible ? data.ftaInfo.agreement + " — " + data.ftaInfo.savings : "No applicable FTA for primary target"}
${countryContext}${rulingsContext}${eventsContext}

Write in this format:

## Executive Summary
[2-3 paragraphs. Talk TO the client like an advisor. Be specific — use real numbers, real country names, real trade show dates. Don't just summarize the data — interpret it. What does this mean for THEIR business?]

## Recommendations
1. [Be specific. "Attend Hannover Messe April 20-24" not "consider attending trade shows"]
2. ...

## Next Steps in Export Journey
[3-4 concrete, time-bound next steps. Not generic advice — specific actions based on the data.]

Be bold. Use the actual trade values. Reference specific trade shows by name and date. If the Country Commercial Guide says something important about market entry, cite it. No fluff, no filler.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

/* ── Fallback synthesis ── */
function getTemplateSynthesis(
  companyName: string,
  product: string,
  targetCountries: string[],
  hsCodes: HSCodeSuggestion[],
  tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number }>,
  primaryCountry: string,
): string {
  const topPartners = tradeFlows[0]?.partners.slice(0, 5) || [];
  const primaryHS = hsCodes[0]?.code || "N/A";

  return `## Executive Summary

Based on analysis of global trade flows for HS ${primaryHS} (${hsCodes[0]?.description || product}), the total global import market is valued at ${tradeFlows[0] ? formatTradeValue(tradeFlows[0].totalValue) : "significant"} [Source: UN Comtrade 2023].

${companyName}'s target markets (${targetCountries.join(", ")}) represent meaningful import demand. ${topPartners[0] ? `${topPartners[0].country} leads global imports at ${formatTradeValue(topPartners[0].tradeValue)} (${topPartners[0].share}% market share) [Source: UN Comtrade 2023].` : ""}

## Recommendations

1. **Start with ${primaryCountry}** — ${getFTAInfo(primaryHS, primaryCountry).eligible ? `${getFTAInfo(primaryHS, primaryCountry).agreement} provides duty-free access [Source: USTR.gov]` : "Strong import demand with established distribution networks [Source: UN Comtrade 2023]"}.
2. **Leverage HS ${primaryHS}** classification for customs documentation [Source: USITC HTS].
3. **Use Letters of Credit** for initial transactions with new buyers [AI Analysis].
4. **Apply for SBA STEP grants** — up to $15,000 reimbursement for trade show attendance and market entry costs [Source: SBA.gov STEP Program].

## Next Steps in Export Journey

1. Register on export.gov and connect with your local SBDC export advisor
2. Attend a relevant trade show in your primary target market within the next 6 months
3. Obtain necessary certifications for the target market
4. Set up international payment infrastructure with your bank`;
}

/* ── Report Generators (all source-cited) ── */

function generateMarketReport(
  companyName: string,
  product: string,
  hsCodes: HSCodeSuggestion[],
  tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number }>,
  targetCountries: string[],
  synthesis: string,
  crossRulings: CrossRuling[],
  countryGuide: CountryGuide | null,
  tradeEvents: TradeEvent[],
): string {
  const reportId = `MKT-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  const top = tradeFlows[0]?.partners.slice(0, 10) || [];

  const hsTable = hsCodes
    .map((h) => `| ${h.code} | ${h.description} | ${h.generalDutyRate} | ${h.confidence}% |`)
    .join("\n");

  const marketTable = top
    .map((p, i) => {
      const isTarget = targetCountries.some((tc) => p.country.toLowerCase().includes(tc.toLowerCase()));
      return `| ${i + 1} | ${isTarget ? "**" + p.country + "** ★" : p.country} | ${formatTradeValue(p.tradeValue)} | ${p.share}% |`;
    })
    .join("\n");

  let report = `# Market Research Report

**Report ID:** ${reportId}
**Generated:** ${timestamp}
**Company:** ${companyName}
**Product:** ${product}
**Target Markets:** ${targetCountries.join(", ")}

---

## Data Sources Used

| Source | Description | Last Updated |
|--------|-------------|-------------|
| [UN Comtrade](https://comtradeplus.un.org/) | Global trade flow data | 2023 |
| [USITC HTS](https://hts.usitc.gov/) | Harmonized Tariff Schedule | Current |
| [CBP CROSS](https://rulings.cbp.gov) | Binding classification rulings | Current |
${countryGuide ? `| [Trade.gov CCG](https://www.trade.gov/country-commercial-guides) | Country Commercial Guide — ${countryGuide.country} | ${countryGuide.fetchedAt.split("T")[0]} |` : ""}

---

## HS Code Classification

*Source: [USITC Harmonized Tariff Schedule](https://hts.usitc.gov/)*

| Code | Description | Duty Rate | Confidence |
|------|-------------|-----------|------------|
${hsTable}

${formatRulingsForReport(crossRulings)}

## Top Importing Countries

*Source: [UN Comtrade Database](https://comtradeplus.un.org/) — 2023 data*

| Rank | Country | Import Value | Market Share |
|------|---------|-------------|-------------|
${marketTable}

★ = Your target market

---

${synthesis}`;

  // Add country intelligence section
  if (countryGuide) {
    report += `\n\n---\n\n${formatGuideForReport(countryGuide)}`;
  }

  // Add trade events section
  if (tradeEvents.length > 0) {
    report += `\n\n---\n\n${formatTradeEventsForReport(tradeEvents.slice(0, 8))}`;
  }

  report += `\n\n---\n\n*Generated by Propeller AI — ${timestamp}*\n*All data sourced from U.S. government databases and international trade organizations. AI-generated analysis is labeled [AI Analysis].*`;

  return report;
}

function generateComplianceReport(
  companyName: string,
  screening: { matchCount: number; listsChecked: number; topMatches: Array<{ name: string; score: number; source: string }> },
  exportControls: { eccn: string; licenseRequired: boolean; notes: string },
  ftaInfo: { eligible: boolean; agreement: string; savings: string },
  hsCode: string,
  destination: string,
  endUseAssessment: EndUseRiskAssessment,
): string {
  const reportId = `SCR-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  const status = screening.matchCount > 0 ? "FLAGGED" : "CLEAR";

  let report = `# Compliance & End-Use Screening Report

**Report ID:** ${reportId}
**Generated:** ${timestamp}
**Entity:** ${companyName}
**Screening Result:** ${status}
**End-Use Risk Level:** ${endUseAssessment.riskLevel.toUpperCase()}

---

## Data Sources Used

| Source | Description |
|--------|-------------|
| [U.S. Consolidated Screening List](https://www.trade.gov/consolidated-screening-list) | ${screening.listsChecked} federal lists, 25,000+ entities |
| [BIS Export Administration Regulations](https://www.bis.doc.gov/) | Export classification and controls |
| [BIS Red Flag Indicators](https://www.bis.doc.gov/index.php/all-articles/23-compliance-a-training/51-red-flag-indicators) | End-use risk assessment |
| [USTR.gov](https://ustr.gov/trade-agreements/free-trade-agreements) | FTA eligibility |

---

## Entity Screening: ${status}

*Source: [U.S. Consolidated Screening List](https://www.trade.gov/consolidated-screening-list)*

${screening.matchCount > 0
    ? `⚠️ ${screening.matchCount} potential match(es):\n\n${screening.topMatches.map((m) => `- **${m.name}** (${m.score}% match) — Source: ${m.source}`).join("\n")}\n\n**Action Required:** Manual review recommended.`
    : `✓ No matches found across all federal screening lists.\n\nLists checked:\n- OFAC Specially Designated Nationals (SDN)\n- OFAC Sectoral Sanctions (SSI)\n- BIS Entity List\n- BIS Denied Persons List\n- BIS Unverified List\n- BIS Military End User List\n- ITAR Debarred List\n- Nonproliferation Sanctions\n- And ${screening.listsChecked - 8} additional federal lists`
  }

## Export Classification

*Source: [BIS EAR](https://www.bis.doc.gov/index.php/regulations/export-administration-regulations-ear)*

- **HS Code:** ${hsCode}
- **ECCN:** ${exportControls.eccn}
- **License Required:** ${exportControls.licenseRequired ? "Yes" : "No"}
- **Destination:** ${destination}
${exportControls.notes ? `- **Notes:** ${exportControls.notes}` : ""}

${formatEndUseForReport(endUseAssessment)}

## FTA Eligibility

*Source: [USTR.gov Free Trade Agreements](https://ustr.gov/trade-agreements/free-trade-agreements)*

${ftaInfo.eligible
    ? `✓ **Eligible** under ${ftaInfo.agreement}\n- **Savings:** ${ftaInfo.savings}`
    : `✗ No applicable Free Trade Agreement for ${destination}`
  }

---

*Generated by Propeller AI — ${timestamp}*
*Screening data sourced from official U.S. government databases. This report does not constitute legal advice — consult a licensed export compliance professional for binding determinations.*`;

  return report;
}

/* ── Outreach Package Generator ── */
function generateOutreachPackage(
  companyName: string,
  product: string,
  hsCode: string,
  primaryCountry: string,
  targetCountries: string[],
  tradeEvents: TradeEvent[],
  countryGuide: CountryGuide | null,
): string {
  const reportId = `OUT-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  const greeting = getCountryGreeting(primaryCountry);
  const formality = getCountryFormality(primaryCountry);

  // Get relevant trade events for outreach
  const relevantEvents = tradeEvents.slice(0, 3);

  // Get market entry notes from country guide
  let entryNotes = "";
  if (countryGuide) {
    const entrySection = countryGuide.sections.find((s) => s.slug === "market-entry-strategy");
    const sellingSection = countryGuide.sections.find((s) => s.slug === "selling-factors-and-techniques");
    if (entrySection) {
      entryNotes = `\n## Market Entry Notes for ${primaryCountry}\n\n*Source: [Trade.gov Country Commercial Guide](${entrySection.url})*\n\n${entrySection.content.slice(0, 800)}\n`;
    }
    if (sellingSection) {
      entryNotes += `\n## Selling Tips for ${primaryCountry}\n\n*Source: [Trade.gov Country Commercial Guide](${sellingSection.url})*\n\n${sellingSection.content.slice(0, 800)}\n`;
    }
  }

  let report = `# Buyer Outreach Package

**Report ID:** ${reportId}
**Generated:** ${timestamp}
**From:** ${companyName}
**Target Market:** ${primaryCountry}
**Product:** ${product}
**HS Code:** ${hsCode}

---

## Email 1 — Initial Contact (${primaryCountry})

**Subject:** ${companyName} — ${product} for ${primaryCountry} Market

---

${greeting}

${formality.opening}

${companyName} is a US-based manufacturer specializing in ${product}. We are expanding our international operations and believe there is strong potential for partnership in the ${primaryCountry} market.

**Our capabilities include:**
- Advanced manufacturing with precision tolerances
- Full material traceability and quality certifications
- Competitive pricing with reliable delivery schedules
- HS Code ${hsCode} classification for streamlined customs clearance

We would welcome the opportunity to discuss how our products could support your supply chain. ${formality.closing}

${formality.signoff}

---

## Email 2 — Follow-Up (Day 5)

**Subject:** Re: ${companyName} — Following Up

---

${greeting}

I wanted to follow up regarding ${companyName}'s ${product} capabilities.

To help with your evaluation, I can provide:
- Detailed technical specifications and data sheets
- Sample pricing for typical order quantities
- References from existing international clients
- A sample shipment for quality evaluation

Would a brief call this week work to discuss your requirements?

${formality.signoff}

---

## Follow-Up Schedule

| Day | Action | Channel |
|-----|--------|---------|
| Day 1 | Initial outreach email | Email |
| Day 5 | Follow-up email | Email |
| Day 10 | LinkedIn connection request | LinkedIn |
| Day 14 | Value-add follow-up with datasheet | Email |
| Day 21 | Phone call attempt | Phone |
| Day 30+ | Monthly industry update | Email |

## Talking Points for Sales Calls

- Lead with specific product specs matching the buyer's import needs
- Reference trade data: "${primaryCountry} imports significant volumes in HS ${hsCode}" [Source: UN Comtrade 2023]
- Highlight US manufacturing quality standards and certifications
- Offer LC at sight for new relationships
${targetCountries.map((c) => `- ${c}: ${getFTAInfo(hsCode, c).eligible ? getFTAInfo(hsCode, c).agreement + " duty benefits [Source: USTR.gov]" : "Growing import demand [Source: UN Comtrade]"}`).join("\n")}`;

  if (relevantEvents.length > 0) {
    report += `\n\n## Trade Events to Consider\n\n`;
    relevantEvents.forEach((e) => {
      report += `- **${e.name}** — ${e.startDate}${e.endDate ? ` to ${e.endDate}` : ""} | ${e.location}\n`;
      report += `  [Details](${e.url}) | *Source: ${e.source}*\n`;
    });
  }

  if (entryNotes) {
    report += `\n\n---\n${entryNotes}`;
  }

  report += `\n\n---\n\n*Generated by Propeller AI — ${timestamp}*`;

  return report;
}

function getCountryGreeting(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("japan")) return "Dear Sir/Madam,";
  if (c.includes("korea")) return "Dear Sir/Madam,";
  if (c.includes("germany")) return "Sehr geehrte Damen und Herren,";
  if (c.includes("mexico") || c.includes("brazil") || c.includes("colombia") || c.includes("chile") || c.includes("argentina") || c.includes("peru")) return "Estimado/a señor/señora,";
  if (c.includes("france")) return "Madame, Monsieur,";
  return "Dear Sir/Madam,";
}

function getCountryFormality(country: string): { opening: string; closing: string; signoff: string } {
  const c = country.toLowerCase();
  if (c.includes("japan") || c.includes("korea")) {
    return {
      opening: "I hope this message finds you well. I am writing to respectfully introduce our company and explore a potential business relationship.",
      closing: "We would be honored to discuss this opportunity at your convenience.",
      signoff: "With kind regards,\n[Your Name]\nExport Sales Department",
    };
  }
  if (c.includes("germany") || c.includes("austria") || c.includes("switzerland")) {
    return {
      opening: "I am writing to introduce our company and explore potential business opportunities.",
      closing: "We would welcome the opportunity to discuss this further. Would a brief call be convenient?",
      signoff: "Mit freundlichen Grüßen,\n[Your Name]\nInternational Sales",
    };
  }
  return {
    opening: "I hope this message finds you well. I'm reaching out to introduce our company and explore potential business opportunities.",
    closing: "I'd love to schedule a brief call to discuss. What does your calendar look like this week?",
    signoff: "Best regards,\n[Your Name]",
  };
}

/* ── Finance Report Generator ── */
function generateFinanceReport(
  companyName: string,
  product: string,
  hsCode: string,
  _primaryCountry: string,
  targetCountries: string[],
  ftaInfo: { eligible: boolean; agreement: string; savings: string },
  hsCodes: HSCodeSuggestion[],
): string {
  const reportId = `FIN-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  const dutyRate = hsCodes[0]?.generalDutyRate || "2.9%";

  return `# Export Finance Summary

**Report ID:** ${reportId}
**Generated:** ${timestamp}
**Company:** ${companyName}
**Product:** ${product}
**HS Code:** ${hsCode}

---

## Data Sources

| Source | Description |
|--------|-------------|
| [USITC HTS](https://hts.usitc.gov/) | Duty rates and tariff classification |
| [USTR.gov](https://ustr.gov/trade-agreements/free-trade-agreements) | FTA eligibility and preferential rates |
| [SBA STEP Program](https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step) | Export assistance grant details |
| [Ex-Im Bank](https://www.exim.gov/) | Export financing programs |

---

## Payment Terms Recommendations

*[AI Analysis — based on standard international trade practices]*

| Market | Relationship | Recommended Terms | Risk Level |
|--------|-------------|-------------------|-----------|
${targetCountries.map((c) => `| ${c} | New buyer | Letter of Credit at sight | ${getCountryRisk(c)} |`).join("\n")}
${targetCountries.map((c) => `| ${c} | Established | Documentary Collection (D/P) | ${getCountryRisk(c)} |`).join("\n")}

## Duty & Tariff Estimates

*Source: [USITC HTS](https://hts.usitc.gov/) for base rates, [USTR.gov](https://ustr.gov/trade-agreements) for FTA rates*

| Destination | HS Code | Base Duty | FTA | Effective Rate |
|-------------|---------|-----------|-----|---------------|
${targetCountries.map((c) => {
    const fta = getFTAInfo(hsCode, c);
    return `| ${c} | ${hsCode} | ${dutyRate} | ${fta.eligible ? fta.agreement : "None"} | ${fta.eligible ? "0%" : dutyRate} |`;
  }).join("\n")}

## Available Financing Programs

1. **SBA STEP Grant** — Up to $15,000 reimbursement for eligible export development activities including trade shows, marketing materials, website localization, and compliance costs.
   *Source: [SBA.gov STEP Program](https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step) — Grant amounts vary by state and funding year. Contact your state's STEP administrator for current availability.*

2. **Ex-Im Bank Working Capital Guarantee** — 90% guarantee on working capital loans for export orders. Enables your bank to provide more favorable terms.
   *Source: [Ex-Im Bank Working Capital](https://www.exim.gov/what-we-do/working-capital)*

3. **Ex-Im Bank Export Credit Insurance** — Protects against buyer non-payment due to commercial or political risks. Policies start at approximately $500/year for small businesses.
   *Source: [Ex-Im Bank Credit Insurance](https://www.exim.gov/what-we-do/export-credit-insurance)*

## Landed Cost Estimate (per $50,000 shipment)

| Component | Amount | Source |
|-----------|--------|--------|
| Product Value (FOB) | $50,000 | — |
| Freight (est.) | $2,500 | Industry average |
| Insurance (0.5%) | $250 | Standard marine cargo rate |
| CIF Value | $52,750 | — |
| Import Duty (${ftaInfo.eligible ? "0% FTA" : dutyRate}) | ${ftaInfo.eligible ? "$0" : "$" + Math.round(52750 * parseFloat(dutyRate) / 100).toLocaleString()} | [USITC HTS](https://hts.usitc.gov/) |
| **Total Landed Cost** | **$${ftaInfo.eligible ? "52,750" : Math.round(52750 * (1 + parseFloat(dutyRate) / 100)).toLocaleString()}** | — |

## Currency Notes

*[AI Analysis]*

${targetCountries.map((c) => `- ${getCurrencyNote(c)}`).join("\n")}

---

*Generated by Propeller AI — ${timestamp}*
*Financial data sourced from U.S. government programs. Grant availability and amounts subject to change — verify with your state SBDC or program administrator.*`;
}

function getCountryRisk(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("canada") || c.includes("australia") || c.includes("japan") || c.includes("germany") || c.includes("united kingdom")) return "Low";
  if (c.includes("south korea") || c.includes("mexico") || c.includes("france") || c.includes("netherlands")) return "Low-Medium";
  if (c.includes("brazil") || c.includes("colombia") || c.includes("india")) return "Medium";
  return "Medium";
}

function getCurrencyNote(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("japan")) return "Japan (JPY): Forward contracts recommended for orders >$25K due to yen volatility";
  if (c.includes("korea")) return "South Korea (KRW): USD-denominated contracts recommended initially";
  if (c.includes("australia")) return "Australia (AUD): Stable — can invoice in AUD once relationship established";
  if (c.includes("canada")) return "Canada (CAD): Low volatility — either currency acceptable";
  if (c.includes("mexico")) return "Mexico (MXN): USD-denominated contracts strongly recommended due to peso volatility";
  if (c.includes("brazil")) return "Brazil (BRL): USD-denominated contracts required — significant currency risk";
  if (c.includes("india")) return "India (INR): USD-denominated contracts recommended";
  if (c.includes("germany") || c.includes("france") || c.includes("netherlands") || c.includes("italy")) return `${country} (EUR): Stable — either USD or EUR acceptable`;
  if (c.includes("united kingdom")) return "United Kingdom (GBP): Stable — either USD or GBP acceptable";
  return `${country}: USD-denominated contracts recommended`;
}
