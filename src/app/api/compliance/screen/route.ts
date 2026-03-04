import { NextRequest, NextResponse } from "next/server";
import { screenEntity, screenEntities } from "@/lib/data/ofac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity, entities } = body as {
      entity?: string;
      entities?: string[];
    };

    if (entity) {
      const result = await screenEntity(entity);
      return NextResponse.json(result);
    }

    if (entities && entities.length > 0) {
      const result = await screenEntities(entities);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide 'entity' (string) or 'entities' (string[])" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Compliance screening error:", error);
    return NextResponse.json(
      { error: "Screening failed" },
      { status: 500 }
    );
  }
}
