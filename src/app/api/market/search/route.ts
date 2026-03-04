import { NextRequest, NextResponse } from "next/server";
import { getTradeFlows } from "@/lib/data/comtrade";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hsCode,
      reporterCountry = "world",
      direction = "import",
      year = 2023,
    } = body as {
      hsCode: string;
      reporterCountry?: string;
      direction?: "import" | "export";
      year?: number;
    };

    if (!hsCode) {
      return NextResponse.json(
        { error: "hsCode is required" },
        { status: 400 }
      );
    }

    const data = await getTradeFlows(hsCode, reporterCountry, direction, year);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Market search error:", error);
    return NextResponse.json(
      { error: "Market search failed" },
      { status: 500 }
    );
  }
}
