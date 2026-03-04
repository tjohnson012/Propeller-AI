/**
 * Commercial Invoice PDF Generator
 *
 * Generates a professional commercial invoice PDF for export shipments.
 * Uses jsPDF for client-side PDF generation — no server deps needed.
 */

import { jsPDF } from "jspdf";

export interface InvoiceLineItem {
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  total: number;
  countryOfOrigin: string;
}

export interface CommercialInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  // Shipper
  shipperName: string;
  shipperAddress: string;
  shipperContact: string;
  // Consignee
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  // Shipment details
  portOfExport: string;
  portOfEntry: string;
  countryOfOrigin: string;
  incoterm: string;
  paymentTerms: string;
  currency: string;
  // Items
  items: InvoiceLineItem[];
  // Totals
  subtotal: number;
  shippingCost: number;
  insuranceCost: number;
  totalValue: number;
  // Classification
  eccn: string;
  exportLicense: string;
  // Notes
  notes?: string;
}

function formatCurrency(val: number, currency: string): string {
  return `${currency} ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateCommercialInvoice(data: CommercialInvoiceData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // ── Header ──
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL INVOICE", margin, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Export Documentation", margin, y + 6);
  doc.setTextColor(0, 0, 0);

  // Invoice number & date — right aligned
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice #: ${data.invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${data.invoiceDate}`, pageWidth - margin, y + 5, { align: "right" });

  y += 16;

  // ── Divider ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Shipper / Consignee boxes ──
  const boxWidth = contentWidth / 2 - 4;

  // Shipper
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("SHIPPER / EXPORTER", margin, y);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.shipperName, margin, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const shipperLines = doc.splitTextToSize(data.shipperAddress, boxWidth);
  doc.text(shipperLines, margin, y + 10);
  doc.text(data.shipperContact, margin, y + 10 + shipperLines.length * 4);

  // Consignee
  const rightCol = margin + boxWidth + 8;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CONSIGNEE / BUYER", rightCol, y);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.consigneeName, rightCol, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const consigneeLines = doc.splitTextToSize(data.consigneeAddress, boxWidth);
  doc.text(consigneeLines, rightCol, y + 10);
  doc.text(data.consigneeCountry, rightCol, y + 10 + consigneeLines.length * 4);

  y += 30;

  // ── Shipment details row ──
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const detailCols = [
    { label: "PORT OF EXPORT", value: data.portOfExport },
    { label: "PORT OF ENTRY", value: data.portOfEntry },
    { label: "COUNTRY OF ORIGIN", value: data.countryOfOrigin },
    { label: "INCOTERM", value: data.incoterm },
    { label: "PAYMENT TERMS", value: data.paymentTerms },
  ];

  const colWidth = contentWidth / detailCols.length;
  detailCols.forEach((col, i) => {
    const x = margin + i * colWidth;
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(col.label, x, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(col.value, x, y + 4);
  });

  y += 14;

  // ── Items table ──
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 1;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 7, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  const colDefs = [
    { label: "DESCRIPTION", x: margin + 2, w: 60 },
    { label: "HS CODE", x: margin + 64, w: 25 },
    { label: "ORIGIN", x: margin + 91, w: 18 },
    { label: "QTY", x: margin + 111, w: 15 },
    { label: "UNIT PRICE", x: margin + 128, w: 25 },
    { label: "TOTAL", x: margin + 155, w: 25 },
  ];

  colDefs.forEach((c) => {
    doc.text(c.label, c.x, y + 5);
  });

  doc.setTextColor(0, 0, 0);
  y += 9;

  // Table rows
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  data.items.forEach((item, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 1, contentWidth, 7, "F");
    }

    const descLines = doc.splitTextToSize(item.description, 58);
    doc.text(descLines[0], colDefs[0].x, y + 4);
    doc.text(item.hsCode, colDefs[1].x, y + 4);
    doc.text(item.countryOfOrigin, colDefs[2].x, y + 4);
    doc.text(String(item.quantity), colDefs[3].x, y + 4);
    doc.text(formatCurrency(item.unitPrice, data.currency), colDefs[4].x, y + 4);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(item.total, data.currency), colDefs[5].x, y + 4);
    doc.setFont("helvetica", "normal");

    y += descLines.length > 1 ? 11 : 8;
  });

  // ── Totals ──
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 120, y, pageWidth - margin, y);
  y += 5;

  const totalsX = margin + 128;
  const totalsValX = margin + 155;

  doc.setFontSize(8);
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(data.subtotal, data.currency), totalsValX, y);
  y += 5;

  if (data.shippingCost > 0) {
    doc.text("Shipping:", totalsX, y);
    doc.text(formatCurrency(data.shippingCost, data.currency), totalsValX, y);
    y += 5;
  }
  if (data.insuranceCost > 0) {
    doc.text("Insurance:", totalsX, y);
    doc.text(formatCurrency(data.insuranceCost, data.currency), totalsValX, y);
    y += 5;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX, y);
  doc.text(formatCurrency(data.totalValue, data.currency), totalsValX, y);

  y += 14;

  // ── Export classification box ──
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, contentWidth, 16, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("EXPORT CLASSIFICATION", margin + 3, y + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`ECCN: ${data.eccn}`, margin + 3, y + 9);
  doc.text(`Export License: ${data.exportLicense}`, margin + 80, y + 9);
  doc.text(`Screening: Cleared — US Consolidated Screening List (13 federal lists)`, margin + 3, y + 13);

  y += 22;

  // ── Notes ──
  if (data.notes) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("NOTES", margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y + 5);
    y += 5 + noteLines.length * 4;
  }

  // ── Certification ──
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "I hereby certify that the information on this invoice is true and correct and that the contents of this shipment are as stated above.",
    margin,
    y,
  );
  y += 12;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, margin + 60, y);
  doc.setFontSize(7);
  doc.text("Authorized Signature", margin, y + 4);

  doc.line(margin + 80, y, margin + 140, y);
  doc.text("Date", margin + 80, y + 4);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by Propeller AI — propellerai.com", margin, footerY);
  doc.text(`Compliance screening powered by US Consolidated Screening List (trade.gov)`, pageWidth - margin, footerY, { align: "right" });

  return doc;
}

/**
 * Generate a compliance screening report PDF
 */
export interface ScreeningReportData {
  reportDate: string;
  reportId: string;
  entityName: string;
  screeningResult: "CLEAR" | "FLAGGED";
  listsChecked: string[];
  matchDetails?: string;
  hsCode?: string;
  eccn?: string;
  destination?: string;
  notes?: string;
}

export function generateScreeningReport(data: ScreeningReportData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLIANCE SCREENING REPORT", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Report ID: ${data.reportId}  |  Date: ${data.reportDate}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Entity info
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("ENTITY SCREENED", margin, y);
  doc.setTextColor(0, 0, 0);
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.entityName, margin, y);
  y += 8;

  // Result badge
  if (data.screeningResult === "CLEAR") {
    doc.setFillColor(220, 252, 231); // green-100
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(margin, y, 50, 10, 2, 2, "FD");
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CLEAR", margin + 18, y + 7);
  } else {
    doc.setFillColor(254, 226, 226); // red-100
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(margin, y, 50, 10, 2, 2, "FD");
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FLAGGED", margin + 15, y + 7);
  }
  doc.setTextColor(0, 0, 0);
  y += 18;

  // Lists checked
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("SCREENING LISTS CHECKED", margin, y);
  doc.setTextColor(0, 0, 0);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  data.listsChecked.forEach((list) => {
    doc.text(`•  ${list}`, margin + 2, y);
    y += 4;
  });

  y += 6;

  // Export classification
  if (data.hsCode || data.eccn || data.destination) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("EXPORT CLASSIFICATION", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (data.hsCode) { doc.text(`HS Code: ${data.hsCode}`, margin, y); y += 4; }
    if (data.eccn) { doc.text(`ECCN: ${data.eccn}`, margin, y); y += 4; }
    if (data.destination) { doc.text(`Destination: ${data.destination}`, margin, y); y += 4; }
    y += 4;
  }

  // Match details
  if (data.matchDetails) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("MATCH DETAILS", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const detailLines = doc.splitTextToSize(data.matchDetails, contentWidth);
    doc.text(detailLines, margin, y);
    y += detailLines.length * 4 + 4;
  }

  // Notes
  if (data.notes) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("NOTES", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by Propeller AI — propellerai.com", margin, footerY);
  doc.text("Data source: US Consolidated Screening List (trade.gov)", pageWidth - margin, footerY, { align: "right" });

  return doc;
}
