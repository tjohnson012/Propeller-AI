/**
 * Export utilities for downloading artifacts as files
 */

import type { ArtifactData } from "@/lib/store";
import {
  generateCommercialInvoice,
  generateScreeningReport,
  type CommercialInvoiceData,
  type ScreeningReportData,
} from "./commercial-invoice";

/**
 * Download a text file
 */
function downloadTextFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert a markdown table to CSV
 */
function markdownTableToCSV(markdown: string): string {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  // Remove separator row (|---|---|...)
  const dataLines = lines.filter((l) => !l.match(/^\|[\s-|]+\|$/));

  return dataLines
    .map((line) =>
      line
        .split("|")
        .filter(Boolean)
        .map((cell) => {
          const cleaned = cell.trim();
          // Quote cells that contain commas
          return cleaned.includes(",") ? `"${cleaned}"` : cleaned;
        })
        .join(","),
    )
    .join("\n");
}

/**
 * Export an artifact based on its type
 */
export function exportArtifact(artifact: ArtifactData) {
  const safeTitle = artifact.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);

  switch (artifact.type) {
    case "table": {
      const csv = markdownTableToCSV(artifact.content);
      downloadTextFile(csv, `${safeTitle}-${timestamp}.csv`, "text/csv");
      break;
    }
    case "report":
    case "document": {
      downloadTextFile(artifact.content, `${safeTitle}-${timestamp}.md`, "text/markdown");
      break;
    }
    default: {
      downloadTextFile(artifact.content, `${safeTitle}-${timestamp}.txt`);
    }
  }
}

/**
 * Copy artifact content to clipboard
 */
export async function copyArtifactToClipboard(artifact: ArtifactData): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(artifact.content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate and download a commercial invoice PDF
 */
export function downloadCommercialInvoice(data: CommercialInvoiceData) {
  const doc = generateCommercialInvoice(data);
  doc.save(`commercial-invoice-${data.invoiceNumber}.pdf`);
}

/**
 * Generate and download a screening report PDF
 */
export function downloadScreeningReport(data: ScreeningReportData) {
  const doc = generateScreeningReport(data);
  doc.save(`screening-report-${data.reportId}.pdf`);
}

/**
 * Generate a sample commercial invoice for demo purposes
 */
export function downloadSampleInvoice() {
  const sampleData: CommercialInvoiceData = {
    invoiceNumber: "PI-2026-0342",
    invoiceDate: new Date().toISOString().slice(0, 10),
    shipperName: "Steel Inc.",
    shipperAddress: "4200 Innovation Blvd\nDayton, OH 45402\nUnited States",
    shipperContact: "export@steelinc.com | +1 (937) 555-0182",
    consigneeName: "Bosch Rexroth AG",
    consigneeAddress: "Zum Eisengießer 1\n97816 Lohr am Main",
    consigneeCountry: "Germany",
    portOfExport: "Port of Norfolk, VA",
    portOfEntry: "Port of Hamburg, DE",
    countryOfOrigin: "United States",
    incoterm: "FOB Norfolk",
    paymentTerms: "Irrevocable LC at sight",
    currency: "USD",
    items: [
      {
        description: "Precision investment castings, steel alloy",
        hsCode: "7325.99",
        quantity: 500,
        unitPrice: 42.50,
        total: 21250.00,
        countryOfOrigin: "US",
      },
      {
        description: "3D printed casting molds, resin composite",
        hsCode: "8480.49",
        quantity: 24,
        unitPrice: 1875.00,
        total: 45000.00,
        countryOfOrigin: "US",
      },
      {
        description: "Industrial valve assemblies, high-pressure",
        hsCode: "8481.80",
        quantity: 100,
        unitPrice: 385.00,
        total: 38500.00,
        countryOfOrigin: "US",
      },
    ],
    subtotal: 104750.00,
    shippingCost: 3200.00,
    insuranceCost: 525.00,
    totalValue: 108475.00,
    eccn: "EAR99",
    exportLicense: "NLR — No License Required",
    notes: "All items manufactured in the United States. Screened against US Consolidated Screening List (13 federal lists) — all parties cleared. Packed on 4 standard pallets. Net weight: 2,840 kg.",
  };

  downloadCommercialInvoice(sampleData);
}

/**
 * Generate a sample screening report for demo purposes
 */
export function downloadSampleScreeningReport() {
  const sampleData: ScreeningReportData = {
    reportDate: new Date().toISOString().slice(0, 10),
    reportId: `SCR-${Date.now().toString(36).toUpperCase()}`,
    entityName: "Bosch Rexroth AG",
    screeningResult: "CLEAR",
    listsChecked: [
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
    ],
    hsCode: "7325.99 — Other cast articles of iron or steel",
    eccn: "EAR99",
    destination: "Germany (DE)",
    notes: "Entity cleared across all 13 federal screening lists. No license required for export of EAR99 items to Germany. Recommended payment terms: Irrevocable Letter of Credit at sight for initial transaction.",
  };

  downloadScreeningReport(sampleData);
}
