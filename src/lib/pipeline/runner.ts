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
import { screenEntity, loadSDNList, getCSLLoadStatus } from "@/lib/data/ofac";
import { searchCrossRulings, formatRulingsForReport } from "@/lib/data/cross-rulings";
import { getCountryGuide, getGuideContextForPipeline, formatGuideForReport } from "@/lib/data/country-guides";
import { getTradeEvents, getMajorTradeShows, formatTradeEventsForReport } from "@/lib/data/trade-events";
import { assessEndUseRisk, formatEndUseForReport } from "@/lib/data/end-use-screening";
import { getUSTradeData, formatCensusTradeForReport } from "@/lib/data/census-trade";
import { getTariffRates, formatTariffForReport } from "@/lib/data/tariffs";
import { getRecentTradeRegulations, formatRegulationsForReport } from "@/lib/data/federal-register";
import { getAnthropicClient, MODEL } from "@/lib/ai/client";
import type { PipelineInput, PipelineEvent } from "./types";
import type { HSCodeSuggestion } from "@/lib/data/hts";
import type { TradePartner } from "@/lib/data/comtrade";
import type { CrossRuling } from "@/lib/data/cross-rulings";
import type { CountryGuide } from "@/lib/data/country-guides";
import type { TradeEvent } from "@/lib/data/trade-events";
import type { EndUseRiskAssessment } from "@/lib/data/end-use-screening";
import type { CensusTradeFlow } from "@/lib/data/census-trade";
import type { TariffRate } from "@/lib/data/tariffs";
import type { FederalRegisterDoc } from "@/lib/data/federal-register";

type Emit = (event: PipelineEvent) => void;

export async function runPipeline(
  input: PipelineInput,
  emit: Emit,
): Promise<void> {
  const { companyName, product, targetCountries } = input;

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
  // STEP 2: Trade Flow Analysis (Comtrade + Census)
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "trade", label: "Querying trade flow databases...", progress: 15 });

  const tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number; isFallback: boolean; fallbackReason?: string }> = [];
  const primaryHS = hsCodes[0]?.code || "7325";
  const primaryCountry = targetCountries[0] || "Canada";

  // Fetch Comtrade and Census data in parallel
  let censusFlows: CensusTradeFlow[] = [];
  const [comtradeResult, censusResult] = await Promise.allSettled([
    getTradeFlows(primaryHS, "world", "import"),
    getUSTradeData(primaryHS, primaryCountry),
  ]);

  if (comtradeResult.status === "fulfilled") {
    tradeFlows.push({
      hsCode: primaryHS,
      partners: comtradeResult.value.partners,
      totalValue: comtradeResult.value.totalValue,
      isFallback: comtradeResult.value.isFallback,
      fallbackReason: comtradeResult.value.fallbackReason,
    });
  }
  if (censusResult.status === "fulfilled") {
    censusFlows = censusResult.value;
  }

  emit({
    type: "step-done",
    step: "trade",
    label: `Trade data: ${tradeFlows[0]?.partners.length || 0} countries (Comtrade)${censusFlows.length > 0 ? ` + ${censusFlows.length} years (Census)` : ""}`,
    progress: 30,
  });

  if (tradeFlows.length > 0 && tradeFlows[0].partners.length > 0) {
    const top = tradeFlows[0].partners.slice(0, 10);
    const targetData = tradeFlows[0].partners.filter((p) =>
      targetCountries.some((tc) => p.country.toLowerCase().includes(tc.toLowerCase())),
    );
    const isEstimate = tradeFlows[0].isFallback;

    let tradeMsg = `**Global Trade Flows for HS ${primaryHS}**\n`;
    tradeMsg += isEstimate
      ? `*Source: Reference estimate — live [UN Comtrade](https://comtradeplus.un.org/) query unavailable (${tradeFlows[0].fallbackReason ?? "no live data"}). Figures below are directional, not authoritative.*\n\n`
      : `*Source: [UN Comtrade Database](https://comtradeplus.un.org/) — 2023 import data*\n\n`;
    tradeMsg += `Total global imports: ${formatTradeValue(tradeFlows[0].totalValue)}${isEstimate ? " *(estimate)*" : ""}\n\n`;
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

    // Add Census Bureau US-specific data
    if (censusFlows.length > 0) {
      tradeMsg += `\n${formatCensusTradeForReport(censusFlows, primaryCountry)}`;
    }

    emit({
      type: "message",
      agentId: "market",
      text: tradeMsg,
      artifact: { type: "table", title: "Trade Flow Analysis", content: tradeMsg },
    });
  }

  // ────────────────────────────────────────────
  // STEP 3: Jurisdiction Risk Check
  // ────────────────────────────────────────────
  // NOTE: We do NOT know the user's actual buyers at pipeline time, so we do not
  // claim to have screened them. We do two honest things:
  //   1. Check whether each target-market *country* appears on a country-wide
  //      sanctions program (Cuba, Iran, N. Korea, Syria, etc.).
  //   2. Load the Consolidated Screening List so the Compliance tab is ready
  //      to screen named buyers the moment the user enters them.
  emit({ type: "step-start", step: "screen", label: "Checking jurisdiction risk for target markets...", progress: 35 });

  await loadSDNList();
  const cslStatus = getCSLLoadStatus();

  // Country-level program check (distinct from entity screening)
  const sanctionedPrograms: Record<string, string> = {
    cuba: "Cuba — comprehensive OFAC sanctions (31 CFR 515)",
    iran: "Iran — comprehensive OFAC sanctions (31 CFR 560)",
    "north korea": "North Korea — comprehensive OFAC sanctions (31 CFR 510)",
    syria: "Syria — comprehensive OFAC sanctions (31 CFR 542)",
    russia: "Russia — broad sectoral sanctions (EO 14024, BIS export controls)",
    belarus: "Belarus — broad sectoral sanctions (EO 14038)",
    venezuela: "Venezuela — targeted sanctions on state-owned enterprises",
    myanmar: "Myanmar — targeted sanctions (EO 14014)",
    burma: "Myanmar — targeted sanctions (EO 14014)",
  };
  const jurisdictionRisks: Array<{ country: string; notes: string }> = [];
  for (const target of targetCountries) {
    const key = target.toLowerCase().trim();
    const hit = Object.entries(sanctionedPrograms).find(([k]) => key.includes(k));
    if (hit) jurisdictionRisks.push({ country: target, notes: hit[1] });
  }

  // We also keep a single representative screening result (company name) so the
  // downstream compliance report has a concrete object to reference. This is
  // explicitly labeled below.
  const screeningResult = await screenEntity(companyName);
  const matchCount = screeningResult.matched ? screeningResult.matches.length : 0;
  const listsCount = screeningResult.listsChecked.length;

  emit({
    type: "step-done",
    step: "screen",
    label: jurisdictionRisks.length > 0
      ? `⚠️ ${jurisdictionRisks.length} target market(s) under sanctions programs`
      : `Target markets clear of country-wide sanctions programs`,
    progress: 45,
  });

  let screenMsg = `**Jurisdiction Risk Check**\n\n`;
  screenMsg += `*Data: [U.S. Consolidated Screening List](https://www.trade.gov/consolidated-screening-list) — ${listsCount} federal lists, `;
  screenMsg += cslStatus.source === "fallback"
    ? `⚠️ offline sample only (${cslStatus.entries} entries) — live CSL fetch failed*\n\n`
    : `${cslStatus.entries.toLocaleString()} entities ${cslStatus.source === "cached" ? "(cached)" : "(live)"}*\n\n`;

  if (jurisdictionRisks.length > 0) {
    screenMsg += `⚠️ **Target markets under active U.S. sanctions programs:**\n`;
    screenMsg += jurisdictionRisks.map((r) => `- **${r.country}** — ${r.notes}`).join("\n");
    screenMsg += `\n\nTransactions with entities in these jurisdictions may require OFAC licensing or be prohibited. Consult export counsel before proceeding.\n\n`;
  } else {
    screenMsg += `✓ None of your target markets (${targetCountries.join(", ")}) are subject to comprehensive U.S. sanctions programs.\n\n`;
  }

  screenMsg += `**Entity screening is a separate step.** When you have specific buyer, consignee, or end-user names, run them through the Compliance dashboard — we'll screen each one against all ${listsCount} federal lists in real time.`;

  emit({ type: "message", agentId: "compliance", text: screenMsg });

  // Invite the user to add real entities they know about
  emit({
    type: "message",
    agentId: "compliance",
    text: `Add a specific buyer, consignee, or supplier to your compliance watchlist to receive daily automated re-screening.`,
    actionCard: {
      type: "watchlist-add",
      title: `Add a counterparty to the compliance watchlist`,
      status: "pending",
      metadata: {
        entity: "",
        type: "buyer",
        country: primaryCountry,
      },
    },
  });

  // ────────────────────────────────────────────
  // STEP 4: End-Use Risk Assessment
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "controls", label: "Assessing end-use risk, tariffs, and export controls...", progress: 50 });

  const exportControls = getExportControlInfo(primaryHS, primaryCountry);
  const ftaInfo = getFTAInfo(primaryHS, primaryCountry);

  // End-use risk assessment
  const endUseAssessment = assessEndUseRisk({
    hsCode: primaryHS,
    product,
    destinationCountry: primaryCountry,
    buyerName: companyName,
  });

  // Tariff rate lookup (FTA + MFN)
  let tariffRates: TariffRate[] = [];
  try {
    tariffRates = await getTariffRates(primaryHS, primaryCountry);
  } catch {
    // Tariff lookup is supplemental
  }

  // Federal Register regulatory updates
  let recentRegulations: FederalRegisterDoc[] = [];
  try {
    recentRegulations = await getRecentTradeRegulations(30, 5);
  } catch {
    // Fed Register is supplemental
  }

  emit({ type: "step-done", step: "controls", label: "Export controls, tariffs, and end-use assessment complete", progress: 58 });

  let controlsMsg = `**Export Controls & End-Use Assessment**\n\n`;
  controlsMsg += `*Sources: [BIS Export Administration Regulations](https://www.bis.doc.gov/), [BIS Country Chart](https://www.bis.doc.gov/index.php/regulations/commerce-control-list-ccl)*\n\n`;
  controlsMsg += `- **HS Code:** ${primaryHS}\n`;
  controlsMsg += `- **Likely ECCN:** ${exportControls.eccn} *(rules-based triage, verify with full CCL review)*\n`;
  controlsMsg += `- **License likely required:** ${exportControls.licenseRequired ? "Yes — consult export counsel" : "No — provisional"}\n`;
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

  // Add tariff rates
  if (tariffRates.length > 0) {
    controlsMsg += `\n\n${formatTariffForReport(tariffRates, primaryCountry)}`;
  }

  // Add recent regulatory updates
  if (recentRegulations.length > 0) {
    controlsMsg += `\n\n${formatRegulationsForReport(recentRegulations)}`;
  }

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
    allEvents.slice(0, 15).forEach((event) => {
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
      censusFlows,
      tariffRates,
      recentRegulations,
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
    text: `**Outreach Templates Ready**\n\nWe prepared introduction and follow-up email templates tuned for ${primaryCountry} business culture${countryGuide ? " using the Trade.gov Country Commercial Guide" : ""}, plus a 30-day follow-up cadence and sales talking points.\n\n> **These are templates, not leads.** Propeller doesn't have a list of verified ${primaryCountry} buyers for your product. To send these, bring your own recipient list (trade-show contacts, importer directories, LinkedIn prospecting) and paste names into the Outreach tab — we'll personalize and track them.\n\nOpen the artifact panel to review.`,
  });

  // ────────────────────────────────────────────
  // STEP 8: Finance Report
  // ────────────────────────────────────────────
  emit({ type: "step-start", step: "finance", label: "Preparing financial analysis...", progress: 88 });

  const financeReport = generateFinanceReport(companyName, product, primaryHS, primaryCountry, targetCountries, ftaInfo, hsCodes, tariffRates);

  emit({ type: "step-done", step: "finance", label: "Financial analysis complete", progress: 92 });

  const mfnRate = tariffRates.find((r) => r.mfnRate)?.mfnRate;
  const prefRate = tariffRates.find((r) => r.preferentialRate);
  const rateLine = mfnRate
    ? `**MFN Rate (${primaryCountry}):** ${mfnRate} *(source: World Bank WITS)*`
    : `**MFN Rate (${primaryCountry}):** not retrieved — look up HS ${primaryHS} on [USITC HTS](https://hts.usitc.gov/)`;
  const prefLine = prefRate
    ? `\n- **${prefRate.ftaName} Preferential Rate:** ${prefRate.preferentialRate} *(if rules of origin are met)*`
    : ftaInfo.eligible
      ? `\n- **${ftaInfo.agreement}:** potential preferential rate — verify RoO for this HS line`
      : `\n- **FTA:** none applicable for ${primaryCountry}`;

  emit({
    type: "message",
    agentId: "finance",
    text: `**Export Finance**\n\n- **Recommended Payment Terms:** Letter of Credit at sight for new ${primaryCountry} buyers *([AI Analysis])*\n- ${rateLine}${prefLine}\n\n*Sources: [SBA STEP Program](https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step), [Ex-Im Bank](https://www.exim.gov/)*\n\nView the full financial analysis in the artifact panel.`,
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

/* ── Helper: Export Controls (rules-based heuristic) ──
 *
 * This is NOT a live CCL/USML lookup. It's a coarse first-pass classification
 * based on HS prefix + destination, useful as "should I look harder?" triage.
 * Actual ECCN assignment requires reviewing the full Commerce Control List
 * against product specs, end-use, and end-user — which is a human job.
 */
function getExportControlInfo(
  hsCode: string,
  destination: string,
): { eccn: string; licenseRequired: boolean; notes: string } {
  const clean = hsCode.replace(/[.\s]/g, "");
  const rulesCaveat = "Rules-based heuristic — not a substitute for full CCL/USML review. Confirm your ECCN with an export-compliance attorney or the BIS SNAP-R advisory opinion process before filing.";

  if (clean.startsWith("9305") || clean.startsWith("9301") || clean.startsWith("9306")) {
    return {
      eccn: "Likely ITAR USML Cat I-IV (or 0A501)",
      licenseRequired: true,
      notes: `Firearms and related components typically fall under ITAR (22 CFR 121 USML) or BIS 0A501. ${rulesCaveat}`,
    };
  }

  if (clean.startsWith("84") || clean.startsWith("73") || clean.startsWith("72")) {
    const sanctionedCountries = ["iran", "north korea", "syria", "cuba", "russia", "belarus"];
    const isSanctioned = sanctionedCountries.some((c) => destination.toLowerCase().includes(c));
    return {
      eccn: "Likely EAR99",
      licenseRequired: isSanctioned,
      notes: isSanctioned
        ? `Comprehensive sanctions apply to this destination — a license is likely required even for EAR99 goods (15 CFR Part 746). ${rulesCaveat}`
        : `General industrial goods in HS 72/73/84 are commonly EAR99 to non-sanctioned destinations (15 CFR Part 734). ${rulesCaveat}`,
    };
  }

  return {
    eccn: "Likely EAR99",
    licenseRequired: false,
    notes: `Most industrial goods outside specialized categories are EAR99. ${rulesCaveat}`,
  };
}

/* ── Helper: FTA Lookup ──
 *
 * Reports only whether a US FTA exists with the destination. It does NOT
 * claim duty-free eligibility for a given HS code, because eligibility
 * depends on rules of origin that vary by tariff line (e.g. USMCA RVC
 * thresholds, regional yarn-forward rules, etc.). Real preferential rates
 * come from `getTariffRates` which queries trade.gov.
 */
function getFTAInfo(
  _hsCode: string,
  destination: string,
): { eligible: boolean; agreement: string; savings: string } {
  const dest = destination.toLowerCase();
  const rooNote = "Preferential rate depends on rules of origin for the specific HS line — verify in the Finance tab.";

  if (dest.includes("canada") || dest.includes("mexico"))
    return { eligible: true, agreement: "USMCA", savings: rooNote };
  if (dest.includes("australia"))
    return { eligible: true, agreement: "US-Australia FTA", savings: rooNote };
  if (dest.includes("south korea") || dest.includes("korea"))
    return { eligible: true, agreement: "KORUS", savings: rooNote };
  if (dest.includes("colombia"))
    return { eligible: true, agreement: "US-Colombia TPA", savings: rooNote };
  if (dest.includes("chile"))
    return { eligible: true, agreement: "US-Chile FTA", savings: rooNote };
  if (dest.includes("peru"))
    return { eligible: true, agreement: "US-Peru TPA", savings: rooNote };
  if (dest.includes("singapore"))
    return { eligible: true, agreement: "US-Singapore FTA", savings: rooNote };
  if (dest.includes("israel"))
    return { eligible: true, agreement: "US-Israel FTA", savings: rooNote };
  if (dest.includes("jordan"))
    return { eligible: true, agreement: "US-Jordan FTA", savings: rooNote };
  if (dest.includes("bahrain"))
    return { eligible: true, agreement: "US-Bahrain FTA", savings: rooNote };
  if (dest.includes("oman"))
    return { eligible: true, agreement: "US-Oman FTA", savings: rooNote };
  if (dest.includes("morocco"))
    return { eligible: true, agreement: "US-Morocco FTA", savings: rooNote };
  if (dest.includes("panama"))
    return { eligible: true, agreement: "US-Panama TPA", savings: rooNote };
  if (dest.includes("dominican republic") || dest.includes("costa rica") || dest.includes("el salvador") || dest.includes("guatemala") || dest.includes("honduras") || dest.includes("nicaragua"))
    return { eligible: true, agreement: "CAFTA-DR", savings: rooNote };

  return { eligible: false, agreement: "", savings: "" };
}

/* ── LLM Synthesis — ONE call with full context ── */
async function synthesizeFindings(data: {
  companyName: string;
  product: string;
  targetCountries: string[];
  hsCodes: HSCodeSuggestion[];
  tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number; isFallback: boolean; fallbackReason?: string }>;
  screening: { status: string; details: string };
  exportControls: { eccn: string; licenseRequired: boolean; notes: string };
  ftaInfo: { eligible: boolean; agreement: string; savings: string };
  endUseAssessment: EndUseRiskAssessment;
  countryGuide: CountryGuide | null;
  crossRulings: CrossRuling[];
  tradeEvents: TradeEvent[];
  censusFlows?: CensusTradeFlow[];
  tariffRates?: TariffRate[];
  recentRegulations?: FederalRegisterDoc[];
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
    data.tradeEvents.slice(0, 12).forEach((e) => {
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

  // Build Census trade data context
  let censusContext = "";
  if (data.censusFlows && data.censusFlows.length > 0) {
    censusContext = `\n\nUS CENSUS BUREAU TRADE DATA (cite as [Source: U.S. Census Bureau International Trade]):\n`;
    data.censusFlows.forEach((f) => {
      censusContext += `- ${f.year}: US exports $${(f.exportValue / 1e6).toFixed(1)}M | US imports $${(f.importValue / 1e6).toFixed(1)}M\n`;
    });
  }

  // Build tariff context
  let tariffContext = "";
  if (data.tariffRates && data.tariffRates.length > 0) {
    tariffContext = `\n\nTARIFF RATES (cite source for each):\n`;
    data.tariffRates.forEach((r) => {
      if (r.mfnRate) tariffContext += `- MFN Rate: ${r.mfnRate} [Source: ${r.source}]\n`;
      if (r.preferentialRate) tariffContext += `- Preferential Rate (${r.ftaName}): ${r.preferentialRate} [Source: ${r.source}]\n`;
      if (r.finalRate && r.finalYear) tariffContext += `  Phase-out: reaches ${r.finalRate} by ${r.finalYear}\n`;
    });
  }

  // Build regulatory updates context
  let regContext = "";
  if (data.recentRegulations && data.recentRegulations.length > 0) {
    regContext = `\n\nRECENT REGULATORY CHANGES (mention if relevant to this export):\n`;
    data.recentRegulations.slice(0, 3).forEach((r) => {
      regContext += `- ${r.title} (${r.publicationDate}) — ${r.agencies.join(", ")}\n`;
    });
  }

  const tradeFlowIsEstimate = data.tradeFlows[0]?.isFallback === true;
  const tradeFlowLabel = tradeFlowIsEstimate
    ? `⚠ REFERENCE ESTIMATE — not live Comtrade data (${data.tradeFlows[0].fallbackReason ?? "live query failed"}). Treat figures as directional only and say so.`
    : `[Source: UN Comtrade 2023]`;

  const prompt = `You are a senior export trade advisor briefing ${data.companyName}'s leadership. Direct, specific, opinionated. Use "you" and "your."

GROUNDING RULES (strict):
1. Every factual claim MUST include a source tag in brackets. Allowed tags:
   - [Source: UN Comtrade 2023] — only when the data below is NOT labeled "⚠ REFERENCE ESTIMATE"
   - [Source: USITC HTS] for HS codes
   - [Source: U.S. Consolidated Screening List] for compliance
   - [Source: Trade.gov Country Commercial Guide — {Country}] for country intelligence
   - [Source: CBP Ruling {number}] for classification rulings
   - [Source: BIS EAR] for export controls
   - [Source: U.S. Census Bureau International Trade] for US-specific trade stats
   - [Source: Trade.gov FTA Tariff Rates] for preferential rates
   - [Source: World Bank WITS] for MFN rates
   - [Source: Federal Register] for regulatory updates
   - [AI Analysis] for your own recommendations / inferences
2. If a data section is marked "⚠ REFERENCE ESTIMATE" or "⚠ DATA UNAVAILABLE," you MUST either (a) skip it entirely or (b) say "directional estimate — verify with live Comtrade" and refuse to cite it as [Source: UN Comtrade 2023].
3. NEVER invent specific numbers, company names, buyer contacts, or tariff rates that aren't in the data below. If a rate isn't given, say "rate not retrieved — check USITC HTS."
4. NEVER claim trade shows or events exist that aren't listed below.
5. When the FTA row says "RoO-dependent," do NOT claim "duty-free." Say "potentially duty-free if rules of origin are met — verify in Finance tab."

PRODUCT: ${data.product}
HS CODES: ${data.hsCodes.map((h) => `${h.code} (${h.description})`).join(", ")}
TARGET MARKETS: ${data.targetCountries.join(", ")}

TRADE FLOWS — ${tradeFlowLabel}
TOP GLOBAL IMPORTERS:
${topMarkets.length > 0 ? topMarkets.map((p, i) => `${i + 1}. ${p.country}: ${formatTradeValue(p.tradeValue)} (${p.share}%)`).join("\n") : "⚠ DATA UNAVAILABLE — no trade flow data retrieved"}

TARGET MARKET DATA:
${targetData.length > 0 ? targetData.map((p) => `- ${p.country}: ${formatTradeValue(p.tradeValue)} imports (${p.share}% share)`).join("\n") : "⚠ DATA UNAVAILABLE for target markets — say so if you reference them"}

COMPLIANCE: ${data.screening.status} | ECCN: ${data.exportControls.eccn} | License Required: ${data.exportControls.licenseRequired ? "Yes" : "No"}
END-USE RISK: ${data.endUseAssessment.riskLevel.toUpperCase()} ${data.endUseAssessment.flags.length > 0 ? "— " + data.endUseAssessment.flags.map(f => f.description).join("; ") : ""}
FTA: ${data.ftaInfo.eligible ? `${data.ftaInfo.agreement} exists (RoO-dependent — verify for this HS line)` : "No applicable FTA for primary target"}
${countryContext}${rulingsContext}${censusContext}${tariffContext}${regContext}${eventsContext}

Format:

## Executive Summary
[2–3 paragraphs. Address the client directly. Use specific figures from above. If trade-flow data is directional, say so plainly.]

## Recommendations
1. [Specific action tied to the data above. If a specific trade show is listed, name it with its date. Do NOT invent shows.]
2. ...

## Next Steps
[3–4 concrete, time-bound steps grounded in what was actually retrieved. No generic boilerplate.]

No fluff. No filler. No invented facts.`;

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
  tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number; isFallback: boolean }>,
  primaryCountry: string,
): string {
  const topPartners = tradeFlows[0]?.partners.slice(0, 5) || [];
  const primaryHS = hsCodes[0]?.code || "N/A";
  const flowIsEstimate = tradeFlows[0]?.isFallback === true;
  const flowCitation = flowIsEstimate ? "[reference estimate — not live Comtrade]" : "[Source: UN Comtrade 2023]";
  const fta = getFTAInfo(primaryHS, primaryCountry);

  return `## Executive Summary

Based on trade flows for HS ${primaryHS} (${hsCodes[0]?.description || product}), the global import market is valued at ${tradeFlows[0] ? formatTradeValue(tradeFlows[0].totalValue) : "an undetermined amount"} ${flowCitation}.

${companyName}'s target markets (${targetCountries.join(", ")}) represent meaningful demand. ${topPartners[0] ? `${topPartners[0].country} leads with ${formatTradeValue(topPartners[0].tradeValue)} (${topPartners[0].share}% share) ${flowCitation}.` : ""}${flowIsEstimate ? "\n\n> Live Comtrade was unavailable for this run — figures above are a directional reference only. Re-run when the API is reachable for authoritative numbers." : ""}

## Recommendations

1. **Start with ${primaryCountry}** — ${fta.eligible ? `${fta.agreement} may provide preferential tariff treatment if rules of origin are met for HS ${primaryHS} [Source: USTR.gov]. Verify with the Finance tab.` : "No US FTA applies. Expect MFN tariff treatment — see Finance tab for the live rate."}
2. **Leverage HS ${primaryHS}** classification for customs documentation [Source: USITC HTS].
3. **Use Letters of Credit** for initial transactions with new buyers [AI Analysis].
4. **Apply for SBA STEP grants** — your state's program reimburses eligible export development costs; contact your state SBDC for current amounts [Source: SBA.gov STEP Program].

## Next Steps

1. Register on export.gov and connect with your local SBDC export advisor.
2. Identify a specific trade show in ${primaryCountry} within the next 6 months (see the Trade Shows tab).
3. Obtain certifications the target market requires (check the Country Commercial Guide).
4. Set up LC-capable international payment infrastructure with your bank.`;
}

/* ── Report Generators (all source-cited) ── */

function generateMarketReport(
  companyName: string,
  product: string,
  hsCodes: HSCodeSuggestion[],
  tradeFlows: Array<{ hsCode: string; partners: TradePartner[]; totalValue: number; isFallback: boolean; fallbackReason?: string }>,
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

${tradeFlows[0]?.isFallback
  ? `*⚠ Reference estimate — live [UN Comtrade](https://comtradeplus.un.org/) query unavailable (${tradeFlows[0].fallbackReason ?? "no live data"}). Figures below are directional, not authoritative. Re-run when the API is reachable.*`
  : `*Source: [UN Comtrade Database](https://comtradeplus.un.org/) — 2023 data*`}

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
    report += `\n\n---\n\n${formatTradeEventsForReport(tradeEvents.slice(0, 20))}`;
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

  const report = `# Compliance & End-Use Screening Report

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
  tariffRates: TariffRate[] = [],
): string {
  const reportId = `FIN-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  const liveMfn = tariffRates.find((r) => r.mfnRate)?.mfnRate;
  const livePref = tariffRates.find((r) => r.preferentialRate);
  const dutyRate = liveMfn || hsCodes[0]?.generalDutyRate || "rate not retrieved";
  const dutySource = liveMfn ? "World Bank WITS (live MFN)" : hsCodes[0]?.generalDutyRate ? "USITC HTS (US general rate — verify destination rate)" : "not retrieved";

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

*Source: ${dutySource}. Preferential rates require rules-of-origin verification — figures below show what's available, not a binding determination.*

| Destination | HS Code | MFN Rate | FTA Available | Preferential Rate (if RoO met) |
|-------------|---------|----------|---------------|--------------------------------|
${targetCountries.map((c) => {
    const fta = getFTAInfo(hsCode, c);
    const pref = fta.eligible ? (livePref?.preferentialRate ?? "verify RoO") : "—";
    return `| ${c} | ${hsCode} | ${dutyRate} | ${fta.eligible ? fta.agreement : "None"} | ${pref} |`;
  }).join("\n")}

> **Note on FTA rates.** "Preferential rate" applies only if your product meets the agreement's rules of origin (typically a regional value content threshold or a tariff-shift rule). Claiming preference without qualifying exposes you to duty reclamation and penalties. Look up the specific RoO for your HS line on [CBP Tools](https://www.cbp.gov/trade/priority-issues/trade-agreements).

## Available Financing Programs

1. **SBA STEP Grant** — Up to $15,000 reimbursement for eligible export development activities including trade shows, marketing materials, website localization, and compliance costs.
   *Source: [SBA.gov STEP Program](https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step) — Grant amounts vary by state and funding year. Contact your state's STEP administrator for current availability.*

2. **Ex-Im Bank Working Capital Guarantee** — 90% guarantee on working capital loans for export orders. Enables your bank to provide more favorable terms.
   *Source: [Ex-Im Bank Working Capital](https://www.exim.gov/what-we-do/working-capital)*

3. **Ex-Im Bank Export Credit Insurance** — Protects against buyer non-payment due to commercial or political risks. Policies start at approximately $500/year for small businesses.
   *Source: [Ex-Im Bank Credit Insurance](https://www.exim.gov/what-we-do/export-credit-insurance)*

## Landed Cost Estimate (per $50,000 shipment)

*Two scenarios — use whichever matches your rules-of-origin position.*

${(() => {
    const mfnPct = parseFloat(dutyRate);
    const prefPct = livePref?.preferentialRate ? parseFloat(livePref.preferentialRate) : 0;
    const mfnDuty = Number.isFinite(mfnPct) ? Math.round(52750 * mfnPct / 100) : null;
    const prefDuty = ftaInfo.eligible && Number.isFinite(prefPct) ? Math.round(52750 * prefPct / 100) : null;
    let rows = `| Component | Scenario A: MFN | Scenario B: FTA preferential |\n`;
    rows += `|-----------|-----------------|------------------------------|\n`;
    rows += `| Product Value (FOB) | $50,000 | $50,000 |\n`;
    rows += `| Freight (est.) | $2,500 | $2,500 |\n`;
    rows += `| Insurance (0.5%) | $250 | $250 |\n`;
    rows += `| CIF Value | $52,750 | $52,750 |\n`;
    rows += `| Import Duty | ${mfnDuty !== null ? `$${mfnDuty.toLocaleString()} (${dutyRate})` : "rate not retrieved"} | ${ftaInfo.eligible ? (prefDuty !== null ? `$${prefDuty.toLocaleString()} (${livePref?.preferentialRate})` : "RoO-dependent") : "N/A"} |\n`;
    rows += `| **Total Landed Cost** | ${mfnDuty !== null ? `**$${(52750 + mfnDuty).toLocaleString()}**` : "—"} | ${ftaInfo.eligible && prefDuty !== null ? `**$${(52750 + prefDuty).toLocaleString()}**` : (ftaInfo.eligible ? "verify RoO" : "—")} |`;
    return rows;
  })()}

## Currency Notes

*[AI Analysis]*

${targetCountries.map((c) => `- ${getCurrencyNote(c)}`).join("\n")}

---

*Generated by Propeller AI — ${timestamp}*
*Financial data sourced from U.S. government programs. Grant availability and amounts subject to change — verify with your state SBDC or program administrator.*`;
}

// Rules-based country-risk bucket — not a live credit or political-risk feed.
// Real assessments should reference OECD country-risk classifications, Ex-Im
// Country Limitation Schedule, or commercial credit insurers like Atradius.
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
