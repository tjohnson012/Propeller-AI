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

/* ── Watchlist Entities ── */

export interface SavedWatchlistEntity {
  id: string;
  user_id?: string;
  entity_name: string;
  entity_type: string;
  country?: string;
  hs_codes?: string[];
  notes?: string;
  status: string;
  last_screened_at?: string;
  last_result?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function saveWatchlistEntity(entity: {
  entityName: string;
  entityType: string;
  country?: string;
  hsCodes?: string[];
  notes?: string;
}): Promise<string | null> {
  const supabase = createClient();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("watchlist_entities")
      .insert({
        user_id: user.id,
        entity_name: entity.entityName,
        entity_type: entity.entityType,
        country: entity.country || null,
        hs_codes: entity.hsCodes || null,
        notes: entity.notes || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save watchlist entity:", error);
      return null;
    }
    return data.id;
  }

  // localStorage fallback
  const id = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entities = getLocalWatchlist();
  entities.push({
    id,
    entity_name: entity.entityName,
    entity_type: entity.entityType,
    country: entity.country,
    hs_codes: entity.hsCodes,
    notes: entity.notes,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  localStorage.setItem("propeller_watchlist", JSON.stringify(entities));
  return id;
}

export async function getWatchlistEntities(): Promise<SavedWatchlistEntity[]> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("watchlist_entities")
      .select("*")
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch watchlist:", error);
      return [];
    }
    return data || [];
  }

  return getLocalWatchlist().filter((e) => e.status !== "archived");
}

export async function updateWatchlistEntity(
  id: string,
  updates: Partial<{ status: string; last_screened_at: string; last_result: Record<string, unknown>; notes: string }>,
): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    await supabase.from("watchlist_entities").update(updates).eq("id", id);
    return;
  }

  const entities = getLocalWatchlist();
  const idx = entities.findIndex((e) => e.id === id);
  if (idx >= 0) {
    entities[idx] = { ...entities[idx], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem("propeller_watchlist", JSON.stringify(entities));
  }
}

export async function deleteWatchlistEntity(id: string): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    await supabase.from("watchlist_entities").delete().eq("id", id);
    return;
  }

  const entities = getLocalWatchlist().filter((e) => e.id !== id);
  localStorage.setItem("propeller_watchlist", JSON.stringify(entities));
}

/* ── Monitoring Alerts ── */

export interface SavedAlert {
  id: string;
  watchlist_entity_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  matched_list?: string;
  matched_entry?: Record<string, unknown>;
  status: string;
  created_at: string;
}

export async function saveAlert(alert: {
  watchlistEntityId: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  matchedList?: string;
  matchedEntry?: Record<string, unknown>;
}): Promise<string | null> {
  const supabase = createClient();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("monitoring_alerts")
      .insert({
        user_id: user.id,
        watchlist_entity_id: alert.watchlistEntityId,
        alert_type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        matched_list: alert.matchedList || null,
        matched_entry: alert.matchedEntry || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save alert:", error);
      return null;
    }
    return data.id;
  }

  // localStorage fallback
  const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const alerts = getLocalAlerts();
  alerts.push({
    id,
    watchlist_entity_id: alert.watchlistEntityId,
    alert_type: alert.alertType,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    matched_list: alert.matchedList,
    matched_entry: alert.matchedEntry,
    status: "unread",
    created_at: new Date().toISOString(),
  });
  localStorage.setItem("propeller_alerts", JSON.stringify(alerts));
  return id;
}

export async function getAlerts(status?: string): Promise<SavedAlert[]> {
  const supabase = createClient();

  if (supabase) {
    let query = supabase
      .from("monitoring_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch alerts:", error);
      return [];
    }
    return data || [];
  }

  const alerts = getLocalAlerts();
  return status ? alerts.filter((a) => a.status === status) : alerts;
}

export async function updateAlertStatus(id: string, status: string): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    await supabase.from("monitoring_alerts").update({ status }).eq("id", id);
    return;
  }

  const alerts = getLocalAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    alerts[idx].status = status;
    localStorage.setItem("propeller_alerts", JSON.stringify(alerts));
  }
}

export async function markAllAlertsRead(): Promise<void> {
  const supabase = createClient();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("monitoring_alerts")
      .update({ status: "read" })
      .eq("user_id", user.id)
      .eq("status", "unread");
    return;
  }

  const alerts = getLocalAlerts();
  for (const a of alerts) {
    if (a.status === "unread") a.status = "read";
  }
  localStorage.setItem("propeller_alerts", JSON.stringify(alerts));
}

export async function getUnreadAlertCount(): Promise<number> {
  const supabase = createClient();

  if (supabase) {
    const { count, error } = await supabase
      .from("monitoring_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread");

    if (error) return 0;
    return count ?? 0;
  }

  return getLocalAlerts().filter((a) => a.status === "unread").length;
}

/* ── Local storage helpers ── */

function getLocalConversations(): SavedConversation[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("propeller_conversations") || "[]");
}

function getLocalWatchlist(): SavedWatchlistEntity[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("propeller_watchlist") || "[]");
}

function getLocalAlerts(): SavedAlert[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("propeller_alerts") || "[]");
}
