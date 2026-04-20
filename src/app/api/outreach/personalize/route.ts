/**
 * Personalize an outreach email draft.
 *
 * Single non-streaming Claude call — takes a country + product + stage +
 * baseline draft and returns a tighter, more human version. Used by the
 * "Personalize with AI" button on the Outreach dashboard.
 */

import { NextRequest } from "next/server";
import { getAnthropicClient, MODEL } from "@/lib/ai/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { country, product, stage, companyName, draft } = body as {
      country: string;
      product: string;
      stage: string;
      companyName?: string;
      draft: string;
    };

    if (!draft || !country) {
      return Response.json({ error: "Missing draft or country" }, { status: 400 });
    }

    const client = getAnthropicClient();

    const prompt = `You're rewriting an outreach email draft to make it sound more human and less like a template.

Recipient market: ${country}
Sender's product: ${product || "industrial manufactured goods"}
Stage: ${stage}
Sender: ${companyName || "a US manufacturer"}

Rules:
- Stay under 160 words.
- Keep the existing greeting and signoff line verbatim.
- Cut filler phrases ("I hope this message finds you well", "I wanted to reach out", etc.) unless they genuinely help.
- One specific claim or detail beats three vague ones.
- Don't invent product specs, certifications, or buyer details that weren't provided.
- If the draft has placeholder brackets like [Your Name], leave them — the user fills those in.
- Preserve any bullet lists unless they read generic; rewrite the items to sound specific.

DRAFT:
${draft}

Return only the rewritten email body — no commentary, no preamble.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim();

    return Response.json({ text });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Personalize failed" },
      { status: 500 },
    );
  }
}
