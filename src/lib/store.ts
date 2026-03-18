import { create } from "zustand";
import type { AgentId } from "./constants";

/* ── Types ── */

export interface ActionCardData {
  type: "approval" | "classification" | "buyer-lead" | "document" | "watchlist-add";
  title: string;
  status: "pending" | "approved" | "rejected" | "confirmed" | "dismissed";
  metadata?: Record<string, string>;
}

export interface ArtifactData {
  type: "table" | "document" | "report";
  title: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  agentId?: AgentId;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  actionCard?: ActionCardData;
  artifact?: ArtifactData;
}

export interface AgentStatus {
  agentId: AgentId;
  status: "idle" | "working" | "complete";
  currentTask: string;
  progress: number;
}

/* ── Product Profile ── */

export interface ProductProfile {
  companyName: string;
  category: string;
  products: string;
  targetMarkets: string[];
}

/* ── Monitoring Types ── */

export interface WatchlistEntity {
  id: string;
  entityName: string;
  entityType: "buyer" | "supplier" | "intermediary" | "end-user";
  country?: string;
  hsCodes?: string[];
  notes?: string;
  status: "active" | "paused" | "archived";
  lastScreenedAt?: string;
  lastResult?: { matchCount: number; riskLevel: string; topMatch?: string };
}

export interface MonitoringAlert {
  id: string;
  watchlistEntityId: string;
  entityName?: string;
  alertType: "match_found" | "match_changed" | "match_removed" | "list_updated";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  matchedList?: string;
  status: "unread" | "read" | "acknowledged" | "dismissed";
  createdAt: string;
}

/* ── Store ── */

interface AppStore {
  // Sidebar
  sidebarExpanded: boolean;
  setSidebarExpanded: (v: boolean) => void;

  // Product profile
  productProfile: ProductProfile | null;
  setProductProfile: (profile: ProductProfile) => void;
  setupComplete: boolean;
  setSetupComplete: (v: boolean) => void;

  // Conversation
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;

  // Agents
  agentStatuses: AgentStatus[];
  setAgentStatuses: (statuses: AgentStatus[]) => void;
  updateAgentStatus: (agentId: AgentId, update: Partial<AgentStatus>) => void;

  // Artifacts
  selectedArtifact: ArtifactData | null;
  setSelectedArtifact: (artifact: ArtifactData | null) => void;
  artifactPanelOpen: boolean;
  setArtifactPanelOpen: (open: boolean) => void;

  // Action cards
  updateActionCardStatus: (messageId: string, status: ActionCardData["status"]) => void;

  // Workspace
  activeWorkspaceAgent: AgentId | null;
  setActiveWorkspaceAgent: (agentId: AgentId | null) => void;

  // Continue button
  canContinue: boolean;
  setCanContinue: (v: boolean) => void;

  // Persistence
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  conversationHistory: Array<{ id: string; title: string; updated_at: string }>;
  setConversationHistory: (history: Array<{ id: string; title: string; updated_at: string }>) => void;

  // Monitoring
  watchlistEntities: WatchlistEntity[];
  setWatchlistEntities: (entities: WatchlistEntity[]) => void;
  addWatchlistEntity: (entity: WatchlistEntity) => void;
  removeWatchlistEntity: (id: string) => void;
  monitoringAlerts: MonitoringAlert[];
  setMonitoringAlerts: (alerts: MonitoringAlert[]) => void;
  unreadAlertCount: number;
  setUnreadAlertCount: (count: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Sidebar
  sidebarExpanded: false,
  setSidebarExpanded: (v) => set({ sidebarExpanded: v }),

  // Product profile
  productProfile: null,
  setProductProfile: (profile) => set({ productProfile: profile, setupComplete: true }),
  setupComplete: false,
  setSetupComplete: (v) => set({ setupComplete: v }),

  // Conversation
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),

  // Agents
  agentStatuses: [
    { agentId: "market", status: "idle", currentTask: "", progress: 0 },
    { agentId: "compliance", status: "idle", currentTask: "", progress: 0 },
    { agentId: "outreach", status: "idle", currentTask: "", progress: 0 },
    { agentId: "finance", status: "idle", currentTask: "", progress: 0 },
  ] as AgentStatus[],
  setAgentStatuses: (statuses) => set({ agentStatuses: statuses }),
  updateAgentStatus: (agentId, update) =>
    set((s) => ({
      agentStatuses: s.agentStatuses.map((a) =>
        a.agentId === agentId ? { ...a, ...update } : a
      ),
    })),

  // Artifacts
  selectedArtifact: null,
  setSelectedArtifact: (artifact) => set({ selectedArtifact: artifact }),
  artifactPanelOpen: false,
  setArtifactPanelOpen: (open) => set({ artifactPanelOpen: open }),

  // Action cards
  updateActionCardStatus: (messageId, status) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId && m.actionCard
          ? { ...m, actionCard: { ...m.actionCard, status } }
          : m
      ),
    })),

  // Workspace
  activeWorkspaceAgent: null,
  setActiveWorkspaceAgent: (agentId) => set({ activeWorkspaceAgent: agentId }),

  // Continue button
  canContinue: false,
  setCanContinue: (v) => set({ canContinue: v }),

  // Persistence
  currentConversationId: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  conversationHistory: [],
  setConversationHistory: (history) => set({ conversationHistory: history }),

  // Monitoring
  watchlistEntities: [],
  setWatchlistEntities: (entities) => set({ watchlistEntities: entities }),
  addWatchlistEntity: (entity) => set((s) => ({ watchlistEntities: [...s.watchlistEntities, entity] })),
  removeWatchlistEntity: (id) => set((s) => ({ watchlistEntities: s.watchlistEntities.filter((e) => e.id !== id) })),
  monitoringAlerts: [],
  setMonitoringAlerts: (alerts) => set({ monitoringAlerts: alerts }),
  unreadAlertCount: 0,
  setUnreadAlertCount: (count) => set({ unreadAlertCount: count }),
}));
