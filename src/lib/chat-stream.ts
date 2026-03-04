/**
 * Client-side streaming chat helper.
 * Reads newline-delimited JSON events from the /api/chat endpoint
 * and updates the Zustand store in real-time.
 */

import { useAppStore } from "./store";
import type { ChatMessage } from "./store";
import type { AgentId } from "./constants";

const AGENT_NAMES: Record<string, string> = {
  market: "Market Intelligence",
  compliance: "Trade Compliance",
  outreach: "Buyer Outreach",
  finance: "Export Finance",
};

interface SendChatOptions {
  message: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  contextAgent: AgentId | null;
}

/**
 * Send a chat message and stream the response.
 * Updates the store incrementally as events arrive.
 */
export async function sendChatStreaming(opts: SendChatOptions): Promise<void> {
  const { message, conversationHistory, contextAgent } = opts;
  const store = useAppStore.getState();
  const profile = store.productProfile;

  // Clear continue state when sending a new message
  store.setCanContinue(false);

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversationHistory,
      contextAgent,
      productProfile: profile,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errData.error || "Request failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  // Track the "working" status message ID so we can remove it
  let statusMsgId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      const currentStore = useAppStore.getState();

      switch (event.type) {
        case "agent-start": {
          const agentName = AGENT_NAMES[event.agentId] || event.agentId;
          // Remove previous status message if any
          const filtered = statusMsgId
            ? currentStore.messages.filter((m) => m.id !== statusMsgId)
            : currentStore.messages;
          statusMsgId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

          // Show pipeline progress if multi-agent
          const pipelineInfo =
            event.pipelineTotal > 1
              ? ` (${event.pipelinePosition}/${event.pipelineTotal})`
              : "";

          currentStore.setMessages([
            ...filtered,
            {
              id: statusMsgId,
              role: "system",
              text: `${agentName}${pipelineInfo} is analyzing...`,
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);

          // Update agent status bar
          currentStore.updateAgentStatus(event.agentId, {
            status: "working",
            currentTask: "Analyzing...",
            progress: 10,
          });
          break;
        }

        case "tool-start": {
          // Update the status message with what tool is running
          if (statusMsgId) {
            const agentName = AGENT_NAMES[event.agentId] || event.agentId;
            currentStore.setMessages(
              currentStore.messages.map((m) =>
                m.id === statusMsgId
                  ? { ...m, text: `${agentName}: ${event.text}` }
                  : m,
              ),
            );
            // Increment progress
            currentStore.updateAgentStatus(event.agentId, {
              currentTask: event.text,
              progress: Math.min(80, (currentStore.agentStatuses.find((a) => a.agentId === event.agentId)?.progress ?? 10) + 15),
            });
          }
          break;
        }

        case "tool-done": {
          // Keep the status message, will be updated by next event
          break;
        }

        case "message": {
          // Remove the status message and add the real message
          const filtered = statusMsgId
            ? currentStore.messages.filter((m) => m.id !== statusMsgId)
            : currentStore.messages;
          statusMsgId = null;

          const newMsg: ChatMessage = {
            id: `${event.role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: event.role,
            agentId: event.agentId as AgentId | undefined,
            text: event.text,
            timestamp: new Date(),
            artifact: event.artifact,
            actionCard: event.actionCard,
          };

          currentStore.setMessages([...filtered, newMsg]);

          // Update agent status to complete
          if (event.agentId) {
            currentStore.updateAgentStatus(event.agentId, {
              status: "complete",
              currentTask: "Done",
              progress: 100,
            });
          }
          break;
        }

        case "pipeline-complete": {
          // Show the Continue button so users can resume if needed
          currentStore.setCanContinue(true);
          break;
        }

        case "done": {
          // Clean up any remaining status messages
          if (statusMsgId) {
            const filtered = currentStore.messages.filter(
              (m) => m.id !== statusMsgId,
            );
            currentStore.setMessages(filtered);
            statusMsgId = null;
          }
          break;
        }
      }
    }
  }
}
