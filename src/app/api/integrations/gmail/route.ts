import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, MODEL } from "@/lib/ai/client";
import { screenEntity } from "@/lib/data/ofac";

/**
 * Gmail integration webhook.
 * Receives forwarded emails and processes them:
 * - Extracts buyer info from incoming emails
 * - Auto-screens mentioned entities against OFAC
 * - Generates suggested reply drafts
 *
 * In production, this would be called by a Gmail push notification
 * or a Google Apps Script forwarding rule.
 */
export async function POST(request: NextRequest) {
  try {
    const { from, subject, body, action } = await request.json();

    if (action === "analyze") {
      // Analyze an incoming email for trade-relevant info
      let client;
      try {
        client = getAnthropicClient();
      } catch {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
      }

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: `You are an export trade assistant. Analyze the email and extract:
1. Company/entity names mentioned
2. Products discussed
3. Countries referenced
4. Any pricing or payment terms mentioned
5. Action items or follow-ups needed

Return structured JSON with fields: entities[], products[], countries[], terms[], actions[]`,
        messages: [
          {
            role: "user",
            content: `From: ${from}\nSubject: ${subject}\n\n${body}`,
          },
        ],
      });

      const analysisText = response.content[0].type === "text" ? response.content[0].text : "";

      // Auto-screen any entities found
      let entityResults;
      try {
        const parsed = JSON.parse(analysisText);
        if (parsed.entities && parsed.entities.length > 0) {
          const screenings = await Promise.all(
            parsed.entities.slice(0, 5).map((entity: string) => screenEntity(entity))
          );
          entityResults = screenings.map((s, i) => ({
            entity: parsed.entities[i],
            status: s.matches.length > 0 && s.matches[0].score > 80 ? "flagged" : "clear",
            score: s.matches[0]?.score ?? 0,
          }));
        }
      } catch {
        // JSON parse failed, return raw analysis
      }

      return NextResponse.json({
        analysis: analysisText,
        screeningResults: entityResults ?? [],
      });
    }

    if (action === "draft-reply") {
      // Generate a reply draft
      let client;
      try {
        client = getAnthropicClient();
      } catch {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
      }

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: `You are a professional export sales representative. Draft a reply to this email.
Be concise, professional, and culturally appropriate. Focus on moving the deal forward.
If the email is from a non-English speaking country, consider cultural norms.`,
        messages: [
          {
            role: "user",
            content: `Original email:\nFrom: ${from}\nSubject: ${subject}\n\n${body}\n\nDraft a professional reply.`,
          },
        ],
      });

      const draft = response.content[0].type === "text" ? response.content[0].text : "";

      return NextResponse.json({ draft, subject: `Re: ${subject}` });
    }

    return NextResponse.json({ error: "Unknown action. Use 'analyze' or 'draft-reply'" }, { status: 400 });
  } catch (error) {
    console.error("Gmail integration error:", error);
    return NextResponse.json({ error: "Failed to process email" }, { status: 500 });
  }
}
