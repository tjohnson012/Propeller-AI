/**
 * Agent Orchestrator
 *
 * Routes user messages to the appropriate AI agent(s) based on intent.
 * Supports full-pipeline flows (market → compliance → outreach → finance).
 * Streams events back to the client in real-time.
 */

import { getAnthropicClient, MODEL } from "@/lib/ai/client";
import {
  MARKET_TOOLS,
  COMPLIANCE_TOOLS,
  OUTREACH_TOOLS,
  FINANCE_TOOLS,
} from "@/lib/ai/tools";
import { executeTool } from "./tool-handlers";
import type Anthropic from "@anthropic-ai/sdk";

export type AgentId = "market" | "compliance" | "outreach" | "finance";

export interface AgentMessage {
  role: "user" | "agent" | "system";
  agentId?: AgentId;
  text: string;
  artifact?: {
    type: "table" | "document" | "report";
    title: string;
    content: string;
  };
  actionCard?: {
    type: "approval" | "classification" | "buyer-lead" | "document";
    title: string;
    status: "pending";
    metadata?: Record<string, string>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StreamEvent = Record<string, any>;

/* ── Rate limit retry with exponential backoff ── */
async function callWithRetry(
  fn: () => Promise<Anthropic.Message>,
  maxRetries = 3,
  emit?: (event: StreamEvent) => void,
  agentId?: AgentId,
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes("429") || error.message.includes("rate_limit"));

      // Also check Anthropic SDK error shape
      const isApiRateLimit =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status: number }).status === 429;

      if ((isRateLimit || isApiRateLimit) && attempt < maxRetries) {
        // Exponential backoff: 15s, 30s, 60s
        const waitSec = 15 * Math.pow(2, attempt);
        if (emit && agentId) {
          emit({
            type: "message",
            role: "system",
            text: `Rate limit reached — waiting ${waitSec}s before retry (attempt ${attempt + 2}/${maxRetries + 1})...`,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

/* ── Truncate tool results to stay under token limits ── */
function truncateToolResult(result: string, maxChars = 3000): string {
  if (result.length <= maxChars) return result;
  return result.slice(0, maxChars) + "\n\n...[truncated for brevity]...";
}

/* ── Summarize prior agent output for handoff (keep it compact) ── */
export function summarizeForHandoff(output: string, maxChars = 2000): string {
  if (output.length <= maxChars) return output;
  // Keep the first chunk (usually has key findings) and the last chunk (usually has summary)
  const firstHalf = output.slice(0, Math.floor(maxChars * 0.6));
  const lastHalf = output.slice(-Math.floor(maxChars * 0.4));
  return firstHalf + "\n\n...[middle section condensed]...\n\n" + lastHalf;
}

interface AgentConfig {
  systemPrompt: string;
  tools: Anthropic.Tool[];
}

const AGENT_NAMES: Record<AgentId, string> = {
  market: "Market Intelligence",
  compliance: "Trade Compliance",
  outreach: "Buyer Outreach",
  finance: "Export Finance",
};

function buildSystemPrompt(
  base: string,
  profile?: {
    companyName: string;
    category: string;
    products: string;
    targetMarkets: string[];
  } | null,
): string {
  if (!profile) return base;

  const context = [
    `\n\n--- User Profile ---`,
    `Company: ${profile.companyName}`,
    profile.category && `Industry: ${profile.category}`,
    profile.products && `Products: ${profile.products}`,
    profile.targetMarkets.length > 0 && `Target markets: ${profile.targetMarkets.join(", ")}`,
    `Use this context to give specific, relevant advice. Reference their actual products and markets.`,
  ]
    .filter(Boolean)
    .join("\n");

  return base + context;
}

/* ── No-question rule appended to every agent ── */
const NO_QUESTION_RULE = `

ABSOLUTE RULE — READ THIS CAREFULLY:
- NEVER end your response with a question. Do NOT ask "Would you like me to...", "Should I...", "Do you want me to...", etc.
- NEVER ask the user for permission to proceed. Just do it.
- NEVER ask for information you can infer from context. Work with what you have.
- You are part of an automated pipeline. Other agents run after you. Complete YOUR part fully and stop.
- Your response should end with a summary of what you found/did, NOT a question.
- If you want to suggest next steps, phrase them as statements: "The next step is..." not "Would you like me to..."`;

const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  market: {
    systemPrompt: `You are the Market Intelligence Agent for Propeller AI, an export operations platform for US manufacturers.

Your capabilities:
- Search real trade flow data from UN Comtrade
- Classify products to HS codes using the Harmonized Tariff Schedule
- Analyze market opportunities by country and product
- Identify top importing countries for specific products

Your job in the pipeline:
1. Classify the product to find HS codes — use ONE classify call with the most descriptive keyword. Only try a second keyword if the first returns zero results.
2. Pick the best 1-2 HS codes from the results. Search trade flows for each (2 calls max).
3. Call generate_market_report as your FINAL step with whatever data you have.

EFFICIENCY IS CRITICAL — you have a limited number of tool calls. Do NOT waste them:
- ONE classify_hs_code call first. Only retry with a different keyword if zero results.
- ONE or TWO search_trade_flows calls max (use direction="import" and reporter_country="world").
- Do NOT search trade flows per-country individually. The global search shows all top importers.
- Then IMMEDIATELY call generate_market_report. Do NOT delay this.

Rules:
- ALWAYS take action immediately with your tools. Do NOT describe what you could do — do it.
- NEVER say "I need more information" — work with what you have.
- Be concise. Present findings in a structured format.
- Do NOT make up trade data. Use your tools.
- Your LAST tool call MUST be generate_market_report. Do NOT skip this step.` + NO_QUESTION_RULE,
    tools: MARKET_TOOLS,
  },

  compliance: {
    systemPrompt: `You are the Trade Compliance Agent for Propeller AI, an export operations platform for US manufacturers.

Your capabilities:
- Screen entities against the US Government Consolidated Screening List (25,000+ entries, 13 federal lists)
- Check export control classifications (ECCN/EAR)
- Verify FTA eligibility and duty savings
- Generate compliance screening reports

Your job in the pipeline:
1. Take the top HS code and target countries from Market Intelligence
2. Check export controls for the main HS code to ONE key target country
3. Check FTA eligibility for ONE key target country
4. Screen TRADE PARTNERS (buyers, suppliers, intermediaries) — NOT the user's own company. The user's company is the exporter. Screen entities mentioned as potential trade partners, importers, or counterparties.
5. Call generate_screening_report as your FINAL step

IMPORTANT: The company in the User Profile is the USER — they are the exporter. Do NOT screen them. Screen their potential buyers, suppliers, and trade partners in target markets instead.

EFFICIENCY IS CRITICAL — you have limited tool calls:
- Use check_export_controls ONCE with the primary HS code + most important destination
- Use check_fta_eligibility ONCE for the top target country
- Screen trade partner entities with ONE call (use screen_entities_batch if multiple)
- Then IMMEDIATELY call generate_screening_report. Do NOT delay this.

Rules:
- NEVER ask the user for information. Prior agents provided everything. USE IT.
- Do NOT repeat tool calls for every country — one representative check is sufficient.
- Your LAST tool call MUST be generate_screening_report. Do NOT skip this step.` + NO_QUESTION_RULE,
    tools: COMPLIANCE_TOOLS,
  },

  outreach: {
    systemPrompt: `You are the Buyer Outreach Agent for Propeller AI, an export operations platform for US manufacturers.

Your capabilities:
- Draft culturally-adapted outreach emails
- Generate follow-up sequences
- Adapt messaging for different markets and languages

Your job in the pipeline:
1. Draft ONE outreach email for the #1 target market using draft_outreach_email
2. Call generate_outreach_package as your FINAL step

EFFICIENCY IS CRITICAL — you have limited tool calls:
- ONE draft_outreach_email call for the top target country
- Then IMMEDIATELY call generate_outreach_package with company_name, target_country, the email, product_description, and hs_code
- Do NOT draft multiple emails. One high-quality email is enough.

Rules:
- NEVER ask the user for information. Prior agents provided everything. USE IT.
- Use appropriate cultural conventions for the target country.
- Lead with specific product specifications.
- Your LAST tool call MUST be generate_outreach_package. Do NOT skip this step.` + NO_QUESTION_RULE,
    tools: OUTREACH_TOOLS,
  },

  finance: {
    systemPrompt: `You are the Export Finance Agent for Propeller AI, an export operations platform for US manufacturers.

Your capabilities:
- Recommend appropriate payment terms based on buyer risk
- Estimate import duties and landed costs
- Find export financing programs (SBA STEP, Ex-Im Bank, state programs)
- Generate commercial invoices for export documentation
- Assess currency risk and hedging strategies

Your job in the pipeline:
1. Recommend payment terms for the #1 target market
2. Estimate duties for the main HS code to the #1 target
3. Find export financing programs
4. Call generate_commercial_invoice as your FINAL step

EFFICIENCY IS CRITICAL — you have limited tool calls:
- ONE recommend_payment_terms call for the top target country
- ONE estimate_duties call with the main HS code, top destination, and a reasonable value like "$50,000"
- ONE find_export_financing call with the company's state (use "Ohio" if unknown)
- Then IMMEDIATELY call generate_commercial_invoice
- Do NOT repeat calls for multiple countries

Rules:
- NEVER ask the user for information. Prior agents provided everything. USE IT.
- Be practical and specific. Small manufacturers need clear, actionable guidance.
- Your LAST tool call MUST be generate_commercial_invoice. Do NOT skip this step.` + NO_QUESTION_RULE,
    tools: FINANCE_TOOLS,
  },
};

/**
 * Detect which agent(s) should handle a user message.
 * Returns an array — may be all 4 agents for full-pipeline requests.
 */
export function detectAgents(message: string, contextAgent?: AgentId | null): AgentId[] {
  // If there's a context agent (user is on that agent's page), use only it
  if (contextAgent) return [contextAgent];

  const lower = message.toLowerCase();

  // Check for @mentions — single agent
  if (lower.includes("@market")) return ["market"];
  if (lower.includes("@compliance")) return ["compliance"];
  if (lower.includes("@outreach")) return ["outreach"];
  if (lower.includes("@finance")) return ["finance"];

  // ── Full pipeline detection ──
  // When the user wants to "find buyers", "start exporting", or asks for market research
  // with compliance, run the full pipeline: market → compliance → outreach → finance
  const fullPipelineSignals = [
    "find buyers",
    "find international buyers",
    "start with market research",
    "market research and compliance",
    "research and compliance",
    "find qualified buyers",
    "find prospects",
    "start exporting",
    "export to",
    "help me export",
    "full analysis",
    "complete analysis",
    "run everything",
    "all agents",
    "find buyers for",
    "international markets",
  ];
  if (fullPipelineSignals.some((s) => lower.includes(s))) {
    return ["market", "compliance", "outreach", "finance"];
  }

  // ── Multi-agent (2-3) signals ──
  const multiSignals = [
    { signal: "and compliance", agents: ["market", "compliance"] as AgentId[] },
    { signal: "compliance screening", agents: ["market", "compliance"] as AgentId[] },
    { signal: "then screen", agents: ["market", "compliance"] as AgentId[] },
    { signal: "then check", agents: ["market", "compliance"] as AgentId[] },
    { signal: "and outreach", agents: ["market", "compliance", "outreach"] as AgentId[] },
    { signal: "and draft", agents: ["market", "outreach"] as AgentId[] },
    { signal: "and payment", agents: ["market", "compliance", "finance"] as AgentId[] },
    { signal: "and finance", agents: ["market", "compliance", "finance"] as AgentId[] },
  ];
  for (const { signal, agents } of multiSignals) {
    if (lower.includes(signal)) return agents;
  }

  // ── Single-agent keyword scoring ──
  const keywords: Record<AgentId, string[]> = {
    market: [
      "market", "trade flow", "import", "export data",
      "hs code", "classify", "opportunity", "countries", "demand",
      "buyers", "prospects", "market size", "trade data",
    ],
    compliance: [
      "screen", "sanction", "ofac", "compliance", "restricted",
      "entity list", "export control", "eccn", "license", "fta",
      "tariff", "duty", "regulation", "sanctions",
    ],
    outreach: [
      "email", "outreach", "draft", "write", "contact",
      "follow up", "message", "reach out", "introduce",
    ],
    finance: [
      "payment", "finance", "lc", "letter of credit", "insurance",
      "grant", "funding", "terms", "cost", "price",
      "sba", "ex-im", "hedge", "currency", "invoice",
    ],
  };

  const scores: Record<AgentId, number> = { market: 0, compliance: 0, outreach: 0, finance: 0 };
  for (const [agent, kws] of Object.entries(keywords)) {
    for (const kw of kws) {
      if (lower.includes(kw)) scores[agent as AgentId]++;
    }
  }

  const matched = (Object.entries(scores) as [AgentId, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  if (matched.length > 0) return [matched[0][0]];

  // Default to market
  return ["market"];
}

/**
 * Run a single agent with streaming events.
 * Calls the `emit` callback for each event so the client gets real-time updates.
 */
export async function runAgentStreaming(
  agentId: AgentId,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  productProfile?: {
    companyName: string;
    category: string;
    products: string;
    targetMarkets: string[];
  } | null,
  emit?: (event: StreamEvent) => void,
): Promise<void> {
  const config = AGENT_CONFIGS[agentId];
  const agentName = AGENT_NAMES[agentId];

  const send = emit ?? (() => {});

  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch {
    send({
      type: "message",
      role: "agent",
      agentId,
      text: `I'm the ${agentName} agent. The AI service is not configured yet. Please contact your administrator to complete the setup.`,
    });
    return;
  }

  const systemPrompt = buildSystemPrompt(config.systemPrompt, productProfile);

  // Keep only the last 4 history messages to stay lean on tokens
  const claudeMessages: Anthropic.MessageParam[] = [
    ...conversationHistory.slice(-4),
    { role: "user", content: userMessage },
  ];

  try {
    let response = await callWithRetry(
      () =>
        client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          tools: config.tools,
          messages: claudeMessages,
        }),
      3,
      send,
      agentId,
    );

    let iterations = 0;
    const maxIterations = 15;

    while (response.stop_reason === "tool_use" && iterations < maxIterations) {
      iterations++;

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ContentBlock & { type: "tool_use" } => b.type === "tool_use",
      );

      // Stream any text before tool calls
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text",
      );
      if (textBlocks.length > 0) {
        const text = textBlocks.map((b) => b.text).join("\n").trim();
        if (text) {
          send({ type: "message", role: "agent", agentId, text });
        }
      }

      // Execute tools, streaming progress
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const toolLabel = toolUse.name.replace(/_/g, " ");
        send({ type: "tool-start", agentId, tool: toolUse.name, text: `Running ${toolLabel}...` });

        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: truncateToolResult(result),
        });

        send({ type: "tool-done", agentId, tool: toolUse.name });
      }

      // Trim context aggressively after iteration 6 to prevent token bloat
      if (iterations > 6 && claudeMessages.length > 6) {
        const firstMsg = claudeMessages[0];
        const recentMsgs = claudeMessages.slice(-4);
        claudeMessages.length = 0;
        claudeMessages.push(firstMsg, ...recentMsgs);
      }

      claudeMessages.push({ role: "assistant", content: response.content });
      claudeMessages.push({ role: "user", content: toolResults });

      // If approaching the limit, tell the agent to wrap up NOW
      if (iterations >= maxIterations - 2) {
        const wrapUpMsg: Anthropic.MessageParam = {
          role: "user",
          content: `SYSTEM NOTICE: You are running out of tool calls. You have ${maxIterations - iterations} calls remaining. IMMEDIATELY call your report/document generation tool with whatever data you have collected so far, then provide your final summary. Do NOT make any more research calls — wrap up NOW.`,
        };
        claudeMessages.push(wrapUpMsg);
      }

      response = await callWithRetry(
        () =>
          client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: config.tools,
            messages: claudeMessages,
          }),
        3,
        send,
        agentId,
      );
    }

    // If we hit maxIterations and the agent still wanted to use tools,
    // force one final call without tools to get a text summary
    if (response.stop_reason === "tool_use" && iterations >= maxIterations) {
      send({ type: "message", role: "system", text: `${agentName} is wrapping up...` });

      claudeMessages.push({ role: "assistant", content: response.content });
      claudeMessages.push({
        role: "user",
        content: "You have used all available tool calls. Summarize your findings now. Present everything you have found so far in a clear, structured format. Do NOT attempt any more tool calls.",
      });

      // Call without tools to force text-only response
      response = await callWithRetry(
        () =>
          client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: claudeMessages,
          }),
        3,
        send,
        agentId,
      );
    }

    // Extract final text
    const finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (finalText) {
      const msg: StreamEvent = { type: "message", role: "agent", agentId, text: finalText };

      // Detect tables for artifact panel
      if (finalText.includes("|") && finalText.split("|").length > 10) {
        const tableLines = finalText.split("\n").filter((l) => l.includes("|"));
        if (tableLines.length > 2) {
          msg.artifact = {
            type: "table",
            title: `${agentId === "market" ? "Trade Flow" : "Screening"} Results`,
            content: tableLines.join("\n"),
          };
        }
      }

      // Detect market reports for artifact panel
      if (agentId === "market" && (finalText.includes("Market Research Report") || finalText.includes("Market Report") || finalText.includes("Top Markets"))) {
        msg.artifact = {
          type: "report",
          title: "Market Research Report",
          content: finalText,
        };
      }

      // Detect compliance reports for artifact panel
      if (agentId === "compliance" && (finalText.includes("Compliance Screening Report") || finalText.includes("Screening Report") || finalText.includes("CLEAR") || finalText.includes("FLAGGED"))) {
        msg.artifact = {
          type: "report",
          title: "Compliance Screening Report",
          content: finalText,
        };
      }

      // Detect outreach packages for artifact panel
      if (agentId === "outreach" && (finalText.includes("Outreach Package") || finalText.includes("Subject:") || finalText.includes("Dear "))) {
        msg.artifact = {
          type: "document",
          title: "Outreach Email Package",
          content: finalText,
        };
      }

      // Detect commercial invoices for artifact panel
      if (agentId === "finance" && finalText.includes("Commercial Invoice")) {
        msg.artifact = {
          type: "document",
          title: "Commercial Invoice",
          content: finalText,
        };
      }

      // Detect compliance flags for action cards
      if (agentId === "compliance" && finalText.includes("FLAGGED")) {
        msg.actionCard = {
          type: "approval",
          title: "Review flagged entity",
          status: "pending",
          metadata: { agent: "Trade Compliance", action: "Manual review required" },
        };
      }

      send(msg);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error occurred";

    if (errMsg.includes("API key")) {
      send({
        type: "message",
        role: "system",
        text: "AI service is not configured. Please contact your administrator to complete the setup.",
      });
    } else {
      send({ type: "message", role: "system", text: `Agent error: ${errMsg}` });
    }
  }
}

/**
 * Non-streaming fallback (kept for backward compat with other routes)
 */
export async function runAgent(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  contextAgent?: AgentId | null,
): Promise<AgentMessage[]> {
  const agentIds = detectAgents(userMessage, contextAgent ?? undefined);
  const messages: AgentMessage[] = [];

  for (const agentId of agentIds) {
    await runAgentStreaming(agentId, userMessage, conversationHistory, null, (event) => {
      if (event.type === "message") {
        messages.push({
          role: event.role,
          agentId: event.agentId,
          text: event.text,
          artifact: event.artifact,
          actionCard: event.actionCard,
        });
      }
    });
  }

  return messages;
}
