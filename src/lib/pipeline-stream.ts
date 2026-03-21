/**
 * Client-side pipeline streaming helper.
 * Reads events from /api/pipeline and updates the Zustand store.
 * Used for structured workflows (Find buyers, Run compliance, etc.)
 */

import { useAppStore } from "./store";
import type { ChatMessage } from "./store";
import { saveConversation, saveMessage } from "./supabase/persistence";

interface PipelineOptions {
  companyName: string;
  product: string;
  targetCountries: string[];
  companyState?: string;
}

export async function runPipelineStreaming(opts: PipelineOptions): Promise<void> {
  const store = useAppStore.getState();
  store.setCanContinue(false);

  // Create/get conversation for persistence
  let conversationId = store.currentConversationId;
  if (!conversationId) {
    try {
      conversationId = await saveConversation(
        `${opts.product} — ${opts.targetCountries.join(", ")}`,
        { companyName: opts.companyName, products: opts.product, targetMarkets: opts.targetCountries },
      );
      if (conversationId) {
        store.setCurrentConversationId(conversationId);
      }
    } catch {
      // Persistence is optional
    }
  }

  const response = await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Pipeline request failed" }));
    throw new Error(errData.error || "Pipeline request failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let statusMsgId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

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
        case "step-start": {
          // Remove previous status message
          const filtered = statusMsgId
            ? currentStore.messages.filter((m) => m.id !== statusMsgId)
            : currentStore.messages;
          statusMsgId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

          currentStore.setMessages([
            ...filtered,
            {
              id: statusMsgId,
              role: "system",
              text: event.label || "Processing...",
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);

          // Update agent status bars
          if (event.step === "classify" || event.step === "trade") {
            currentStore.updateAgentStatus("market", {
              status: "working",
              currentTask: event.label,
              progress: event.progress || 10,
            });
          } else if (event.step === "screen" || event.step === "controls") {
            currentStore.updateAgentStatus("compliance", {
              status: "working",
              currentTask: event.label,
              progress: event.progress || 10,
            });
          } else if (event.step === "synthesize") {
            currentStore.updateAgentStatus("market", {
              status: "working",
              currentTask: event.label,
              progress: event.progress || 75,
            });
          } else if (event.step === "outreach") {
            currentStore.updateAgentStatus("outreach", {
              status: "working",
              currentTask: event.label,
              progress: event.progress || 50,
            });
          } else if (event.step === "finance") {
            currentStore.updateAgentStatus("finance", {
              status: "working",
              currentTask: event.label,
              progress: event.progress || 50,
            });
          }
          break;
        }

        case "step-done": {
          // Update the status message text
          if (statusMsgId) {
            currentStore.setMessages(
              currentStore.messages.map((m) =>
                m.id === statusMsgId ? { ...m, text: event.label || "Done" } : m,
              ),
            );
          }

          // Mark agents as complete at their final step
          if (event.step === "trade") {
            currentStore.updateAgentStatus("market", { status: "complete", currentTask: "Done", progress: 100 });
          } else if (event.step === "controls") {
            currentStore.updateAgentStatus("compliance", { status: "complete", currentTask: "Done", progress: 100 });
          } else if (event.step === "outreach") {
            currentStore.updateAgentStatus("outreach", { status: "complete", currentTask: "Done", progress: 100 });
          } else if (event.step === "finance") {
            currentStore.updateAgentStatus("finance", { status: "complete", currentTask: "Done", progress: 100 });
          }

          if (event.progress) {
            // Update progress for relevant agent
            if (event.step === "classify" || event.step === "trade") {
              currentStore.updateAgentStatus("market", { progress: event.progress });
            } else if (event.step === "screen" || event.step === "controls") {
              currentStore.updateAgentStatus("compliance", { progress: event.progress });
            }
          }
          break;
        }

        case "message": {
          // Remove status message and add the real message
          const filtered = statusMsgId
            ? currentStore.messages.filter((m) => m.id !== statusMsgId)
            : currentStore.messages;
          statusMsgId = null;

          const newMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: "agent",
            agentId: event.agentId,
            text: event.text,
            timestamp: new Date(),
            artifact: event.artifact,
          };

          currentStore.setMessages([...filtered, newMsg]);

          // Persist message
          if (conversationId && event.text) {
            saveMessage(conversationId, {
              role: "agent",
              agentId: event.agentId,
              content: event.text,
              metadata: event.artifact ? { artifact: event.artifact } : undefined,
            }).catch(() => {});
          }
          break;
        }

        case "artifact": {
          // Add artifact as a message with clickable preview
          const artMsg: ChatMessage = {
            id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: "agent",
            agentId: event.agentId,
            text: `📄 **${event.artifact.title}** is ready. Click to view in the artifact panel.`,
            timestamp: new Date(),
            artifact: event.artifact,
          };
          currentStore.setMessages([...currentStore.messages, artMsg]);
          break;
        }

        case "done": {
          if (statusMsgId) {
            const filtered = currentStore.messages.filter((m) => m.id !== statusMsgId);
            currentStore.setMessages(filtered);
            statusMsgId = null;
          }
          // Pipeline is complete — do NOT show Continue button
          // The deterministic pipeline produces complete results in one pass
          currentStore.setCanContinue(false);

          // Mark all agents as complete
          currentStore.updateAgentStatus("market", { status: "complete", currentTask: "Done", progress: 100 });
          currentStore.updateAgentStatus("compliance", { status: "complete", currentTask: "Done", progress: 100 });
          currentStore.updateAgentStatus("outreach", { status: "complete", currentTask: "Done", progress: 100 });
          currentStore.updateAgentStatus("finance", { status: "complete", currentTask: "Done", progress: 100 });

          // Track first analysis completion for onboarding hub
          if (typeof window !== "undefined") {
            localStorage.setItem("propeller_first_analysis", "true");
          }
          break;
        }
      }
    }
  }
}
