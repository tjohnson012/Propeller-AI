/**
 * Client-side CSV parser for product catalogs.
 * Handles quoted fields, various delimiters, and common catalog formats.
 */

export interface ParsedProduct {
  name: string;
  description: string;
  sku?: string;
  category?: string;
  raw: Record<string, string>;
}

export interface ParseResult {
  products: ParsedProduct[];
  headers: string[];
  rowCount: number;
  errors: string[];
}

/** Parse a CSV string into structured product data */
export function parseCSV(text: string): ParseResult {
  const errors: string[] = [];
  const lines = splitCSVLines(text);

  if (lines.length < 2) {
    return { products: [], headers: [], rowCount: 0, errors: ["File is empty or has no data rows"] };
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0]);

  // Parse header row
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

  // Find the best column mappings
  const nameCol = findColumn(headers, ["product", "product name", "name", "item", "item name", "title", "product_name"]);
  const descCol = findColumn(headers, ["description", "desc", "product description", "details", "product_description", "product_desc"]);
  const skuCol = findColumn(headers, ["sku", "part number", "part no", "part_number", "item number", "item_number", "model", "part #", "item #"]);
  const catCol = findColumn(headers, ["category", "type", "product type", "product_type", "group", "classification"]);

  if (nameCol === -1 && descCol === -1) {
    // Try using the first column as name
    if (headers.length > 0) {
      errors.push(`No "product" or "description" column found. Using "${headers[0]}" as product name.`);
    } else {
      return { products: [], headers, rowCount: 0, errors: ["Could not identify product columns"] };
    }
  }

  const products: ParsedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line, delimiter);
    if (fields.length === 0) continue;

    // Build raw record
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = fields[idx]?.trim() ?? "";
    });

    const name = nameCol !== -1
      ? (fields[nameCol]?.trim() ?? "")
      : (fields[0]?.trim() ?? "");

    const description = descCol !== -1
      ? (fields[descCol]?.trim() ?? "")
      : "";

    const sku = skuCol !== -1 ? (fields[skuCol]?.trim() ?? undefined) : undefined;
    const category = catCol !== -1 ? (fields[catCol]?.trim() ?? undefined) : undefined;

    if (name || description) {
      products.push({ name, description, sku, category, raw });
    }
  }

  return {
    products,
    headers,
    rowCount: products.length,
    errors,
  };
}

function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  // Partial match
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

function splitCSVLines(text: string): string[] {
  // Handle both \r\n and \n
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}
