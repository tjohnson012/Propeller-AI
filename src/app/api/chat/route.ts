import { NextRequest } from "next/server";
import { runAgentStreaming, detectAgents, summarizeForHandoff } from "@/lib/agents/orchestrator";
import type { AgentId } from "@/lib/agents/orchestrator";

const AGENT_NAMES: Record<AgentId, string> = {
  market: "Market Intelligence",
  compliance: "Trade Compliance",
  outreach: "Buyer Outreach",
  finance: "Export Finance",
};

const AGENT_HANDOFF_DIRECTIVES: Record<AgentId, string> = {
  market: `You are the Market Intelligence agent. You are FIRST in the pipeline.
YOUR JOB: Classify the product to HS codes, search trade flows, identify top markets. Your LAST tool call MUST be generate_market_report to create a downloadable document.`,
  compliance: `You are the Compliance agent. Market Intelligence has already identified HS codes, target countries, and trade data above.
YOUR JOB: Use those HS codes to check export controls and FTA eligibility for each target country. Screen TRADE PARTNERS (buyers, suppliers, importers) — NOT the user's own company. The user is the exporter. Do NOT re-classify products. Your LAST tool call MUST be generate_screening_report to create a downloadable compliance report.`,
  outreach: `You are the Outreach agent. Market Intelligence found target countries and Trade Compliance cleared the export.
YOUR JOB: Draft outreach emails for the top 2-3 target markets using draft_outreach_email. Generate a follow-up for the #1 market. Your LAST tool call MUST be generate_outreach_package to create a downloadable email package.`,
  finance: `You are the Finance agent. The prior agents identified target countries, HS codes, compliance status, and began outreach.
YOUR JOB: Recommend payment terms, estimate duties using the HS codes, find export financing programs. Your LAST tool call MUST be generate_commercial_invoice to create a downloadable invoice document.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      contextAgent = null,
      productProfile = null,
    } = body as {
      message: string;
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
      contextAgent?: AgentId | null;
      productProfile?: {
        companyName: string;
        category: string;
        products: string;
        targetMarkets: string[];
      } | null;
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agentIds = detectAgents(message, contextAgent ?? undefined);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            // Controller may be closed if client disconnected
          }
        };

        // Keep conversation history slim — only last 4 exchanges
        const history = [...conversationHistory.slice(-4)];

        // Collect output from each agent to pass as context to the next one
        const priorAgentOutputs: Array<{ agentId: AgentId; output: string }> = [];

        // ── Run agent pipeline with re-routing support ──
        let complianceFlagged = false;

        const runAgent = async (agentId: AgentId, position: number, total: number, extraDirective?: string) => {
          send({
            type: "agent-start",
            agentId,
            pipelinePosition: position,
            pipelineTotal: total,
          });

          let agentMessage = message;
          let agentHistory = history;

          if (priorAgentOutputs.length > 0) {
            // Summarize prior outputs to stay under token limits
            const priorContext = priorAgentOutputs
              .map(({ agentId: priorId, output }) => {
                const priorName = AGENT_NAMES[priorId];
                return `=== ${priorName} findings ===\n${summarizeForHandoff(output)}`;
              })
              .join("\n\n");

            const directive = extraDirective || AGENT_HANDOFF_DIRECTIVES[agentId] || "";

            agentMessage = `The user's original request: "${message}"

Prior agent findings (summarized):

${priorContext}

${directive}

Remember: Do NOT ask any questions. Do NOT ask for permission. Complete your analysis and present your findings.`;

            // Don't pass full prior context as conversation history — just the directive
            agentHistory = history.slice(-2);
          }

          let agentOutput = "";

          try {
            await runAgentStreaming(
              agentId,
              agentMessage,
              agentHistory,
              productProfile,
              (event) => {
                if (event.type === "message" && event.role === "agent") {
                  agentOutput += (agentOutput ? "\n\n" : "") + event.text;
                }
                send(event);
              },
            );
          } catch (err) {
            send({
              type: "message",
              role: "system",
              text: `Agent error: ${err instanceof Error ? err.message : "Unknown error"}`,
            });
          }

          if (agentOutput) {
            if (agentId === "compliance" && agentOutput.includes("FLAGGED")) {
              complianceFlagged = true;
            }
            priorAgentOutputs.push({ agentId, output: agentOutput });
          }
        };

        // Run the initial pipeline with rate-limit-safe delays between agents
        for (let i = 0; i < agentIds.length; i++) {
          // Add a 5-second breathing room between agents to avoid rate limits
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
          await runAgent(agentIds[i], i + 1, agentIds.length);
        }

        // ── Dynamic re-routing ──
        // If compliance flagged an entity during a multi-agent pipeline,
        // re-engage Market and Outreach to adjust recommendations
        if (complianceFlagged && agentIds.length > 1) {
          send({
            type: "message",
            role: "system",
            text: "Compliance flagged an entity — re-routing agents to adjust recommendations.",
          });

          // Re-run outreach with updated compliance context if it was in the pipeline
          if (agentIds.includes("outreach")) {
            await runAgent("outreach", agentIds.length + 1, agentIds.length + 1,
              `IMPORTANT UPDATE: Compliance has FLAGGED one or more entities. Review the compliance findings above carefully.
Adjust your outreach strategy: exclude any flagged entities from your email targets. If the flagged entity was a primary target, draft an email for the next-best alternative market instead.
Your LAST tool call MUST be generate_outreach_package.`
            );
          }
        }

        // Let the client know it can continue if needed
        send({ type: "pipeline-complete", agentCount: agentIds.length });
        send({ type: "done" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
