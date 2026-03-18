"use client";

import { cn } from "@/lib/utils";
import { agentColorMap, type AgentId } from "@/lib/constants";
import type { ActionCardData } from "@/lib/store";
import { useAppStore } from "@/lib/store";
import { sendChatStreaming } from "@/lib/chat-stream";
import { Check, X, Eye, Shield } from "lucide-react";
import { useState } from "react";

interface ActionCardProps {
  messageId: string;
  data: ActionCardData;
  agentId?: AgentId;
}

const agentBorderColors: Record<AgentId, string> = {
  market: "border-l-agent-market",
  compliance: "border-l-agent-compliance",
  outreach: "border-l-agent-outreach",
  finance: "border-l-agent-finance",
};

export function ActionCard({ messageId, data, agentId }: ActionCardProps) {
  const updateActionCardStatus = useAppStore((s) => s.updateActionCardStatus);
  const borderColor = agentId ? agentBorderColors[agentId] : "border-l-accent";
  const isPending = data.status === "pending";
  const [acting, setActing] = useState(false);

  const handleAction = async (
    status: ActionCardData["status"],
    followUpMessage?: string,
  ) => {
    if (acting) return;
    setActing(true);

    // Update the card status visually
    updateActionCardStatus(messageId, status);

    // If there's a follow-up message, send it to continue the workflow
    if (followUpMessage) {
      const userMsg = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "user" as const,
        text: followUpMessage,
        timestamp: new Date(),
      };
      useAppStore.getState().addMessage(userMsg);

      try {
        const currentMessages = useAppStore.getState().messages;
        const history = currentMessages
          .filter((m) => m.role === "user" || m.role === "agent")
          .slice(-10)
          .map((m) => ({
            role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: m.text,
          }));

        await sendChatStreaming({
          message: followUpMessage,
          conversationHistory: history,
          contextAgent: null,
        });
      } catch {
        // Error handled by stream
      }
    }

    setActing(false);
  };

  return (
    <div
      className={cn(
        "surface-card border-l-4 p-4 mt-3",
        borderColor
      )}
    >
      <p className="text-sm text-text-primary font-medium mb-2">
        {data.title}
      </p>

      {data.metadata && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {Object.entries(data.metadata).map(([key, value]) => (
            <span key={key} className="text-xs text-text-tertiary">
              <span className="text-text-muted">{key}:</span> {value}
            </span>
          ))}
        </div>
      )}

      {isPending && (data.type === "approval" || data.type === "classification") && (
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleAction(
                "approved",
                `Approved: ${data.title}. Proceed with the workflow.`,
              )
            }
            disabled={acting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-agent-outreach-muted text-agent-outreach hover:bg-agent-outreach/20 transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() =>
              handleAction(
                "rejected",
                `Rejected: ${data.title}. Exclude this entity and continue with remaining entities.`,
              )
            }
            disabled={acting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      )}

      {isPending && data.type === "buyer-lead" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleAction(
                "approved",
                `Added to outreach: ${data.title}. Draft an outreach email for this buyer.`,
              )
            }
            disabled={acting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-agent-outreach-muted text-agent-outreach hover:bg-agent-outreach/20 transition-colors disabled:opacity-50"
          >
            Add to outreach
          </button>
          <button
            onClick={() => handleAction("dismissed")}
            disabled={acting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}

      {isPending && data.type === "watchlist-add" && (
        <button
          onClick={async () => {
            try {
              await fetch("/api/monitoring", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "add_entity",
                  entityName: data.metadata?.entity || data.title,
                  entityType: data.metadata?.type || "buyer",
                  country: data.metadata?.country,
                }),
              });
              handleAction("approved");
            } catch {
              handleAction("approved");
            }
          }}
          disabled={acting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-agent-compliance-muted text-agent-compliance hover:bg-agent-compliance/20 transition-colors disabled:opacity-50"
        >
          <Shield className="w-3.5 h-3.5" />
          Add to Watchlist
        </button>
      )}

      {isPending && data.type === "document" && (
        <button
          onClick={() => handleAction("confirmed")}
          disabled={acting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-muted text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          <Eye className="w-3.5 h-3.5" />
          View in panel
        </button>
      )}

      {!isPending && (
        <div className="flex items-center gap-1.5 text-xs">
          {(data.status === "approved" || data.status === "confirmed") && (
            <>
              <Check className="w-3.5 h-3.5 text-agent-outreach" />
              <span className="text-agent-outreach font-medium capitalize">{data.status}</span>
            </>
          )}
          {(data.status === "rejected" || data.status === "dismissed") && (
            <>
              <X className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 font-medium capitalize">{data.status}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
