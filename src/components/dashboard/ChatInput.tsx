"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { agents, agentColorMap, type AgentId } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { sendChatStreaming } from "@/lib/chat-stream";
import { Send, AtSign, X, Loader2 } from "lucide-react";

interface ChatInputProps {
  agentContext: AgentId | null;
}

export function ChatInput({ agentContext }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const placeholder = agentContext
    ? `Message ${agents.find((a) => a.id === agentContext)?.name ?? "agent"}...`
    : "Ask your agents anything...";

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      text,
      timestamp: new Date(),
    };
    useAppStore.getState().addMessage(userMsg);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    setSending(true);

    try {
      // Build conversation history from current messages
      const currentMessages = useAppStore.getState().messages;
      const history = currentMessages
        .filter((m) => m.role === "user" || m.role === "agent")
        .slice(-10)
        .map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

      await sendChatStreaming({
        message: text,
        conversationHistory: history,
        contextAgent: agentContext,
      });
    } catch (error) {
      useAppStore.getState().addMessage({
        id: `error-${Date.now()}`,
        role: "system",
        text: error instanceof Error ? error.message : "Failed to reach the server",
        timestamp: new Date(),
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, agentContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  return (
    <div className="shrink-0 border-t border-border-primary bg-bg-primary p-4">
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-end gap-2">
          {/* @ mention */}
          <div className="relative">
            <button
              onClick={() => setMentionOpen(!mentionOpen)}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                mentionOpen
                  ? "bg-accent-muted text-accent"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {mentionOpen ? <X className="w-4 h-4" /> : <AtSign className="w-4 h-4" />}
            </button>

            {mentionOpen && (
              <div className="absolute bottom-11 left-0 w-52 bg-bg-secondary border border-border-hover rounded-lg overflow-hidden z-10">
                {agents.map((agent) => {
                  const colors = agentColorMap[agent.id];
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setInput((prev) => `@${agent.name} ${prev}`);
                        setMentionOpen(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-tertiary transition-colors text-left"
                    >
                      <div className={cn("w-5 h-5 rounded flex items-center justify-center", colors.bg)}>
                        <agent.icon className={cn("w-3 h-3", colors.text)} />
                      </div>
                      <span className="text-sm text-text-secondary">{agent.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextAreaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={sending}
            rows={1}
            className="input-field flex-1 px-4 py-2.5 text-sm resize-none min-h-[40px] max-h-[160px] disabled:opacity-50"
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
              input.trim() && !sending
                ? "bg-accent text-white hover:bg-accent-hover"
                : "text-text-muted",
            )}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
