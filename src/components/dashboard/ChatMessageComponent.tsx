"use client";

import { cn } from "@/lib/utils";
import { agents, agentColorMap, type AgentId } from "@/lib/constants";
import type { ChatMessage } from "@/lib/store";
import { useAppStore } from "@/lib/store";
import { ActionCard } from "./ActionCard";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { FileText } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessage;
}

function TypingDots() {
  return (
    <span className="animation-typing-dots inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
    </span>
  );
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const { setSelectedArtifact, setArtifactPanelOpen } = useAppStore();

  const agent = message.agentId
    ? agents.find((a) => a.id === message.agentId)
    : null;
  const colors = message.agentId ? agentColorMap[message.agentId] : null;

  // System
  if (message.role === "system") {
    return (
      <div className="animation-slide-up py-2 px-4">
        <p className="text-xs text-text-muted text-center font-mono">{message.text}</p>
      </div>
    );
  }

  // User
  if (message.role === "user") {
    return (
      <div className="animation-slide-up flex justify-end py-2 px-4">
        <div className="chat-bubble-user px-4 py-3">
          <p className="text-sm text-text-primary leading-relaxed">
            {message.text}
          </p>
          <p className="text-[10px] text-text-muted mt-1.5 text-right font-mono">
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Agent
  return (
    <div className="animation-slide-up py-2 px-4">
      <div className="flex gap-3 max-w-[90%]">
        {agent && colors && (
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-1",
              colors.bg
            )}
          >
            <agent.icon className={cn("w-3 h-3", colors.text)} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {agent && colors && (
            <p className={cn("text-[11px] font-mono mb-1.5", colors.text)}>
              {agent.name}
            </p>
          )}

          <div
            className="chat-bubble-agent px-4 py-3"
            style={colors ? { borderLeftColor: `var(--agent-${message.agentId})` } : undefined}
          >
            {message.isStreaming ? (
              <TypingDots />
            ) : (
              <MarkdownRenderer content={message.text} />
            )}
          </div>

          {!message.isStreaming && (
            <p className="text-[10px] text-text-muted mt-1.5 font-mono px-1">
              {formatTimestamp(message.timestamp)}
            </p>
          )}

          {message.actionCard && (
            <ActionCard
              messageId={message.id}
              data={message.actionCard}
              agentId={message.agentId}
            />
          )}

          {message.artifact && (
            <button
              onClick={() => {
                setSelectedArtifact(message.artifact!);
                setArtifactPanelOpen(true);
              }}
              className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-secondary border border-border-primary hover:border-border-hover transition-colors text-left group"
            >
              <FileText className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
              <div>
                <p className="text-sm text-text-primary group-hover:text-accent transition-colors">
                  {message.artifact.title}
                </p>
                <p className="text-[11px] text-text-muted font-mono">
                  {message.artifact.type}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
