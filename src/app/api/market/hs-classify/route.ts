import { NextRequest, NextResponse } from "next/server";
import { searchHSCodes, lookupHSCode } from "@/lib/data/hts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, code } = body as { query?: string; code?: string };

    if (code) {
      const result = lookupHSCode(code);
      if (!result) {
        return NextResponse.json(
          { error: `HS code ${code} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(result);
    }

    if (query) {
      const results = searchHSCodes(query);
      return NextResponse.json({ query, suggestions: results });
    }

    return NextResponse.json(
      { error: "Provide 'query' (product description) or 'code' (HS code)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("HS classification error:", error);
    return NextResponse.json(
      { error: "Classification failed" },
      { status: 500 }
    );
  }
}
