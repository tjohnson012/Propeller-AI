/**
 * End-use / end-user compliance screening.
 * Supplements the CSL entity screening with:
 * - BIS Military End User (MEU) List indicators
 * - BIS Unverified List (UVL) checks
 * - Red Flag Indicators from BIS guidelines
 * - Dual-use product risk assessment
 *
 * Source: https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern
 */

export interface EndUseRiskAssessment {
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: EndUseFlag[];
  recommendation: string;
  sources: string[];
}

export interface EndUseFlag {
  type: "red-flag" | "dual-use" | "destination" | "end-user" | "end-use";
  description: string;
  severity: "info" | "warning" | "critical";
  source: string;
}

// BIS Red Flag Indicators (from BIS "Know Your Customer" guidance)
// Source: https://www.bis.doc.gov/index.php/all-articles/23-compliance-a-training/51-red-flag-indicators
const RED_FLAG_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /military|defense|armed forces|ministry of defence|mod\b/i,
    description: "Customer appears to be associated with military or defense activities",
  },
  {
    pattern: /nuclear|uranium|centrifuge|enrichment|reactor/i,
    description: "Transaction may involve nuclear proliferation-related end use",
  },
  {
    pattern: /missile|rocket|launch vehicle|propulsion/i,
    description: "Transaction may involve missile technology end use",
  },
  {
    pattern: /chemical|biological|cw\b|bw\b|nerve agent|precursor/i,
    description: "Transaction may involve chemical or biological weapons end use",
  },
  {
    pattern: /surveillance|intercept|monitor|lawful intercept|crypto/i,
    description: "Product may be used for surveillance or communications interception",
  },
];

// Dual-use product categories (based on Commerce Control List categories)
const DUAL_USE_HS_PREFIXES: Record<string, { category: string; concern: string }> = {
  "8401": { category: "Nuclear reactors", concern: "Nuclear proliferation" },
  "8456": { category: "Machine tools (laser/ultrasonic)", concern: "WMD/Military manufacturing" },
  "8457": { category: "Machining centers", concern: "Precision manufacturing for military" },
  "8458": { category: "Lathes", concern: "Precision manufacturing for military" },
  "8459": { category: "Drilling/boring machines", concern: "Precision manufacturing for military" },
  "8462": { category: "Forming/stamping machines", concern: "Military component manufacturing" },
  "8471": { category: "Computers/processors", concern: "Advanced computing for WMD modeling" },
  "8525": { category: "Transmission apparatus", concern: "Communications interception" },
  "8526": { category: "Radar/radio navigation", concern: "Military navigation/targeting" },
  "8541": { category: "Semiconductor devices", concern: "Advanced electronics for military" },
  "8542": { category: "Integrated circuits", concern: "Advanced electronics for military" },
  "8543": { category: "Electrical machines", concern: "Signal processing for military" },
  "9005": { category: "Optical instruments", concern: "Military targeting/surveillance" },
  "9013": { category: "Lasers", concern: "Military/WMD applications" },
  "9014": { category: "Navigation instruments", concern: "Military guidance systems" },
  "9015": { category: "Surveying instruments", concern: "Military mapping/targeting" },
  "9027": { category: "Analysis instruments", concern: "Chemical/biological detection" },
  "9030": { category: "Measurement instruments", concern: "Nuclear/military testing" },
  "9031": { category: "Measuring/checking instruments", concern: "Precision military manufacturing" },
  "9306": { category: "Ammunition", concern: "Direct military use" },
  "9301": { category: "Military weapons", concern: "Direct military use — ITAR controlled" },
  "9302": { category: "Revolvers/pistols", concern: "Direct military use — ITAR controlled" },
  "9305": { category: "Parts for weapons", concern: "Direct military use — ITAR controlled" },
};

// Countries with heightened end-use scrutiny
const HEIGHTENED_SCRUTINY_DESTINATIONS: Record<string, string> = {
  "china": "China — Enhanced end-use screening required for military/intelligence entities (Entity List + MEU List)",
  "russia": "Russia — Comprehensive sanctions; virtually all exports require license",
  "iran": "Iran — Near-total embargo; OFAC license required for most transactions",
  "north korea": "North Korea — Complete embargo; no exports permitted",
  "syria": "Syria — Comprehensive sanctions; OFAC license required",
  "cuba": "Cuba — Restricted; limited exceptions for specific categories",
  "belarus": "Belarus — Enhanced restrictions; many items require license",
  "myanmar": "Myanmar/Burma — Targeted sanctions on military entities",
  "venezuela": "Venezuela — Targeted sanctions on government entities",
  "pakistan": "Pakistan — Enhanced screening for nuclear/missile proliferation",
  "united arab emirates": "UAE — Transshipment hub; enhanced diversion risk screening",
  "hong kong": "Hong Kong — Same export controls as mainland China since 2020",
  "macau": "Macau — Same export controls as mainland China",
};

/**
 * Perform end-use risk assessment for a transaction.
 */
export function assessEndUseRisk(params: {
  hsCode: string;
  product: string;
  destinationCountry: string;
  buyerName?: string;
  buyerDescription?: string;
  statedEndUse?: string;
}): EndUseRiskAssessment {
  const { hsCode, product, destinationCountry, buyerName, buyerDescription, statedEndUse } = params;
  const flags: EndUseFlag[] = [];
  const sources: string[] = [];

  const hsPrefix = hsCode.replace(/\./g, "").slice(0, 4);
  const countryLower = destinationCountry.toLowerCase();
  const allText = `${product} ${buyerName ?? ""} ${buyerDescription ?? ""} ${statedEndUse ?? ""}`;

  // 1. Check if product is in dual-use categories
  const dualUse = DUAL_USE_HS_PREFIXES[hsPrefix];
  if (dualUse) {
    flags.push({
      type: "dual-use",
      description: `HS ${hsCode} (${dualUse.category}) is a potential dual-use item. Concern: ${dualUse.concern}.`,
      severity: "warning",
      source: "BIS Commerce Control List Categories",
    });
    sources.push("BIS Commerce Control List (https://www.bis.doc.gov/index.php/regulations/commerce-control-list-ccl)");
  }

  // 2. Check destination country risk
  const destRisk = HEIGHTENED_SCRUTINY_DESTINATIONS[countryLower];
  if (destRisk) {
    flags.push({
      type: "destination",
      description: destRisk,
      severity: countryLower === "iran" || countryLower === "north korea" || countryLower === "russia"
        ? "critical"
        : "warning",
      source: "BIS Country Chart / OFAC Sanctions Programs",
    });
    sources.push("BIS Country Chart (15 CFR Part 738, Supplement 1)");
  }

  // 3. Check for red flag indicators in buyer/end-use description
  for (const { pattern, description } of RED_FLAG_PATTERNS) {
    if (pattern.test(allText)) {
      flags.push({
        type: "red-flag",
        description,
        severity: "warning",
        source: "BIS Red Flag Indicators (Know Your Customer Guidance)",
      });
      if (!sources.includes("BIS Red Flag Indicators")) {
        sources.push("BIS Red Flag Indicators (https://www.bis.doc.gov/index.php/all-articles/23-compliance-a-training/51-red-flag-indicators)");
      }
    }
  }

  // 4. Cross-check: dual-use product going to heightened scrutiny destination
  if (dualUse && destRisk) {
    flags.push({
      type: "end-use",
      description: `Dual-use product (${dualUse.category}) destined for heightened scrutiny country. Recommend obtaining an end-use statement from the buyer and considering a BIS advisory opinion.`,
      severity: "critical",
      source: "BIS Export Administration Regulations (EAR) Part 744",
    });
    sources.push("EAR Part 744 — End-Use and End-User Based Controls");
  }

  // Determine overall risk level
  let riskLevel: EndUseRiskAssessment["riskLevel"] = "low";
  if (flags.some((f) => f.severity === "critical")) {
    riskLevel = "critical";
  } else if (flags.length >= 2) {
    riskLevel = "high";
  } else if (flags.length === 1) {
    riskLevel = "medium";
  }

  // Generate recommendation
  let recommendation: string;
  switch (riskLevel) {
    case "critical":
      recommendation = "This transaction requires immediate compliance review. Do not proceed without consulting your export compliance officer and potentially filing for a BIS license. An end-use certificate from the buyer should be obtained.";
      break;
    case "high":
      recommendation = "Elevated risk detected. Recommend conducting enhanced due diligence on the end user, obtaining a written end-use statement, and verifying the buyer's business activities through independent sources before proceeding.";
      break;
    case "medium":
      recommendation = "Moderate risk indicators detected. Standard due diligence recommended — verify the buyer's identity and stated end use. Document your compliance checks.";
      break;
    default:
      recommendation = "No significant end-use risk indicators detected. Standard export compliance procedures apply. Maintain transaction records per EAR requirements.";
  }

  if (sources.length === 0) {
    sources.push("BIS Export Administration Regulations (EAR)");
  }

  return { riskLevel, flags, recommendation, sources };
}

/**
 * Format end-use assessment for report output.
 */
export function formatEndUseForReport(assessment: EndUseRiskAssessment): string {
  const riskColors: Record<string, string> = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL",
  };

  let text = `### End-Use Risk Assessment\n\n`;
  text += `**Overall Risk Level: ${riskColors[assessment.riskLevel]}**\n\n`;

  if (assessment.flags.length > 0) {
    text += `#### Risk Indicators\n\n`;
    for (const flag of assessment.flags) {
      const icon = flag.severity === "critical" ? "!!" : flag.severity === "warning" ? "!" : "-";
      text += `${icon} **[${flag.type.toUpperCase()}]** ${flag.description}\n`;
      text += `  *Source: ${flag.source}*\n\n`;
    }
  } else {
    text += `No specific risk indicators identified.\n\n`;
  }

  text += `#### Recommendation\n${assessment.recommendation}\n\n`;

  text += `#### Sources Consulted\n`;
  for (const source of assessment.sources) {
    text += `- ${source}\n`;
  }

  return text;
}
