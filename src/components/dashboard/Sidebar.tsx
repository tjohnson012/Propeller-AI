"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarLinks, agentColorMap } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getConversations, getMessages } from "@/lib/supabase/persistence";
import type { ChatMessage } from "@/lib/store";
import { MessageSquare, Plus, LogOut, Trash2 } from "lucide-react";
import { deleteConversation } from "@/lib/supabase/persistence";
import { createClient } from "@/lib/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarExpanded, setSidebarExpanded, conversationHistory, setConversationHistory, unreadAlertCount } = useAppStore();
  const [showHistory, setShowHistory] = useState(false);

  // Load conversation history on mount
  useEffect(() => {
    getConversations().then((convs) => {
      setConversationHistory(
        convs.map((c) => ({ id: c.id, title: c.title, updated_at: c.updated_at })),
      );
    }).catch(() => {});
  }, [setConversationHistory]);

  const handleNewConversation = useCallback(() => {
    useAppStore.getState().setMessages([]);
    useAppStore.getState().setCurrentConversationId(null);
    useAppStore.getState().setSetupComplete(false);
    useAppStore.getState().setProductProfile(null as never);
  }, []);

  const handleLoadConversation = useCallback(async (convId: string) => {
    try {
      const msgs = await getMessages(convId);
      const chatMsgs: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role as ChatMessage["role"],
        agentId: m.agent_id as ChatMessage["agentId"],
        text: m.content,
        timestamp: new Date(m.created_at),
        artifact: m.metadata?.artifact as ChatMessage["artifact"],
      }));
      useAppStore.getState().setMessages(chatMsgs);
      useAppStore.getState().setCurrentConversationId(convId);
      useAppStore.getState().setSetupComplete(true);
    } catch {
      // Ignore load failures
    }
  }, []);

  const handleDeleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(convId);
    setConversationHistory(conversationHistory.filter((c) => c.id !== convId));
  }, [conversationHistory, setConversationHistory]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  }, []);

  return (
    <aside
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => { setSidebarExpanded(false); setShowHistory(false); }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-bg-secondary border-r border-border-primary transition-all duration-200 overflow-hidden",
        sidebarExpanded ? "w-56" : "w-12"
      )}
    >
      {/* Logo — links to home */}
      <Link href="/" className="h-12 flex items-center px-3 border-b border-border-primary shrink-0 hover:bg-bg-primary transition-colors">
        <span className="font-serif text-base text-text-primary shrink-0">P</span>
        <span
          className={cn(
            "ml-1 font-serif text-base text-text-primary whitespace-nowrap transition-opacity duration-150",
            sidebarExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          ropeller
        </span>
      </Link>

      {/* New conversation button */}
      {sidebarExpanded && (
        <div className="px-2 pt-2">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors border border-border-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            New analysis
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 flex flex-col gap-px px-1.5 overflow-hidden">
        {sidebarLinks.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          const colors = link.agentId ? agentColorMap[link.agentId] : null;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150",
                isActive
                  ? "bg-bg-tertiary text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-bg-primary"
              )}
            >
              <link.icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive && colors ? colors.text : ""
                )}
              />
              <span
                className={cn(
                  "text-sm whitespace-nowrap transition-opacity duration-150",
                  sidebarExpanded ? "opacity-100" : "opacity-0"
                )}
              >
                {link.label}
              </span>
              {link.href === "/dashboard/monitoring" && unreadAlertCount > 0 && (
                <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadAlertCount > 99 ? "99+" : unreadAlertCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* History toggle */}
        {sidebarExpanded && conversationHistory.length > 0 && (
          <>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-primary transition-all mt-2"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="text-sm">History ({conversationHistory.length})</span>
            </button>

            {showHistory && (
              <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                {conversationHistory.slice(0, 10).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-xs text-text-muted hover:text-text-secondary hover:bg-bg-primary transition-colors group"
                  >
                    <span className="flex-1 truncate">{conv.title}</span>
                    <span
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Logout */}
      {sidebarExpanded && (
        <div className="px-2 pb-3 border-t border-border-primary pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-bg-primary transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
