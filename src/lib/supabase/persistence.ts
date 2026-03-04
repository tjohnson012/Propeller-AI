/**
 * Conversation & message persistence layer.
 * Works with Supabase when configured, falls back to localStorage.
 */

import { createClient } from "./client";

export interface SavedConversation {
  id: string;
  title: string;
  product_profile: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface SavedMessage {
  id: string;
  conversation_id: string;
  role: "user" | "agent" | "system";
  agent_id: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/* ── Conversations ── */

export async function saveConversation(
  title: string,
  productProfile?: Record<string, unknown> | null,
): Promise<string | null> {
  const supabase = createClient();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title, product_profile: productProfile })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save conversation:", error);
      return null;
    }
    return data.id;
  }

  // Fallback: localStorage
  const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const convs = getLocalConversations();
  convs.push({
    id,
    title,
    product_profile: productProfile || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  localStorage.setItem("propeller_conversations", JSON.stringify(convs));
  return id;
}

export async function getConversations(): Promise<SavedConversation[]> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, product_profile, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch conversations:", error);
      return [];
    }
    return data || [];
  }

  return getLocalConversations();
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    await supabase.from("conversations").delete().eq("id", id);
    return;
  }

  const convs = getLocalConversations().filter((c) => c.id !== id);
  localStorage.setItem("propeller_conversations", JSON.stringify(convs));
  localStorage.removeItem(`propeller_messages_${id}`);
}

/* ── Messages ── */

export async function saveMessage(
  conversationId: string,
  message: {
    role: "user" | "agent" | "system";
    agentId?: string;
    content: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: message.role,
      agent_id: message.agentId || null,
      content: message.content,
      metadata: message.metadata || null,
    });

    // Update conversation's updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    return;
  }

  // Fallback: localStorage
  const key = `propeller_messages_${conversationId}`;
  const msgs = JSON.parse(localStorage.getItem(key) || "[]");
  msgs.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversation_id: conversationId,
    role: message.role,
    agent_id: message.agentId || null,
    content: message.content,
    metadata: message.metadata || null,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(msgs));
}

export async function getMessages(conversationId: string): Promise<SavedMessage[]> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return [];
    }
    return data || [];
  }

  const key = `propeller_messages_${conversationId}`;
  return JSON.parse(localStorage.getItem(key) || "[]");
}

/* ── Screenings (audit trail) ── */

export async function saveScreening(screening: {
  entityName: string;
  result: "CLEAR" | "FLAGGED";
  matchScore: number;
  details?: Record<string, unknown>;
  conversationId?: string;
}): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("screenings").insert({
      user_id: user.id,
      entity_name: screening.entityName,
      result: screening.result,
      match_score: screening.matchScore,
      details: screening.details,
      conversation_id: screening.conversationId || null,
    });
    return;
  }

  // localStorage fallback
  const screenings = JSON.parse(localStorage.getItem("propeller_screenings") || "[]");
  screenings.push({
    id: `scr-${Date.now()}`,
    ...screening,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem("propeller_screenings", JSON.stringify(screenings));
}

export async function getScreenings(): Promise<Array<{
  id: string;
  entity_name: string;
  result: string;
  match_score: number;
  created_at: string;
}>> {
  const supabase = createClient();

  if (supabase) {
    const { data } = await supabase
      .from("screenings")
      .select("id, entity_name, result, match_score, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data || [];
  }

  return JSON.parse(localStorage.getItem("propeller_screenings") || "[]");
}

/* ── Local storage helpers ── */

function getLocalConversations(): SavedConversation[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("propeller_conversations") || "[]");
}
