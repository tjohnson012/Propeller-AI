"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { WatchlistEntity, MonitoringAlert } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  RefreshCw,
  Clock,
  Eye,
  X,
  Check,
  Trash2,
  Pause,
  Play,
  Search,
  Info,
} from "lucide-react";

type AlertFilter = "all" | "unread" | "critical";

export default function MonitoringPage() {
  const {
    watchlistEntities,
    setWatchlistEntities,
    monitoringAlerts,
    setMonitoringAlerts,
    unreadAlertCount,
    setUnreadAlertCount,
  } = useAppStore();

  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanningEntity, setScanningEntity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<WatchlistEntity["entityType"]>("buyer");
  const [newCountry, setNewCountry] = useState("");
  const [newHsCodes, setNewHsCodes] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/monitoring");
        if (res.ok) {
          const data = await res.json();
          setWatchlistEntities(
            (data.watchlist || []).map((e: Record<string, unknown>) => ({
              id: e.id as string,
              entityName: e.entity_name as string,
              entityType: e.entity_type as WatchlistEntity["entityType"],
              country: e.country as string,
              hsCodes: e.hs_codes as string[],
              notes: e.notes as string,
              status: e.status as WatchlistEntity["status"],
              lastScreenedAt: e.last_screened_at as string,
              lastResult: e.last_result as WatchlistEntity["lastResult"],
            })),
          );
          setMonitoringAlerts(
            (data.alerts || []).map((a: Record<string, unknown>) => ({
              id: a.id as string,
              watchlistEntityId: a.watchlist_entity_id as string,
              alertType: a.alert_type as MonitoringAlert["alertType"],
              severity: a.severity as MonitoringAlert["severity"],
              title: a.title as string,
              description: a.description as string,
              matchedList: a.matched_list as string,
              status: a.status as MonitoringAlert["status"],
              createdAt: a.created_at as string,
            })),
          );
          setUnreadAlertCount(data.unreadCount ?? 0);
        }
      } catch {
        // Silently handle — localStorage fallback in persistence layer
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setWatchlistEntities, setMonitoringAlerts, setUnreadAlertCount]);

  const handleAddEntity = useCallback(async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_entity",
          entityName: newName.trim(),
          entityType: newType,
          country: newCountry.trim() || undefined,
          hsCodes: newHsCodes.trim() ? newHsCodes.split(",").map((c) => c.trim()) : undefined,
          notes: newNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const { id } = await res.json();
        const entity: WatchlistEntity = {
          id,
          entityName: newName.trim(),
          entityType: newType,
          country: newCountry.trim() || undefined,
          hsCodes: newHsCodes.trim() ? newHsCodes.split(",").map((c) => c.trim()) : undefined,
          notes: newNotes.trim() || undefined,
          status: "active",
        };
        setWatchlistEntities([entity, ...watchlistEntities]);
        setNewName("");
        setNewType("buyer");
        setNewCountry("");
        setNewHsCodes("");
        setNewNotes("");
        setShowAddForm(false);
      }
    } catch {
      // Handle error silently
    }
  }, [newName, newType, newCountry, newHsCodes, newNotes, watchlistEntities, setWatchlistEntities]);

  const handleScreenEntity = useCallback(async (entityId: string) => {
    setScanningEntity(entityId);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "screen_entity", entityId }),
      });

      if (res.ok) {
        const { result } = await res.json();
        if (result) {
          setWatchlistEntities(
            watchlistEntities.map((e) =>
              e.id === entityId
                ? {
                    ...e,
                    lastScreenedAt: new Date().toISOString(),
                    lastResult: {
                      matchCount: result.matchCount,
                      riskLevel: result.riskLevel,
                      topMatch: result.topMatchName,
                    },
                  }
                : e,
            ),
          );
        }
      }
    } catch {
      // Handle error silently
    } finally {
      setScanningEntity(null);
    }
  }, [watchlistEntities, setWatchlistEntities]);

  const handleScanAll = useCallback(async () => {
    setScanning(true);
    try {
      await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "screen_all" }),
      });
      // Reload data
      const res = await fetch("/api/monitoring");
      if (res.ok) {
        const data = await res.json();
        setWatchlistEntities(
          (data.watchlist || []).map((e: Record<string, unknown>) => ({
            id: e.id as string,
            entityName: e.entity_name as string,
            entityType: e.entity_type as WatchlistEntity["entityType"],
            country: e.country as string,
            hsCodes: e.hs_codes as string[],
            status: e.status as WatchlistEntity["status"],
            lastScreenedAt: e.last_screened_at as string,
            lastResult: e.last_result as WatchlistEntity["lastResult"],
          })),
        );
        setMonitoringAlerts(
          (data.alerts || []).map((a: Record<string, unknown>) => ({
            id: a.id as string,
            watchlistEntityId: a.watchlist_entity_id as string,
            alertType: a.alert_type as MonitoringAlert["alertType"],
            severity: a.severity as MonitoringAlert["severity"],
            title: a.title as string,
            description: a.description as string,
            matchedList: a.matched_list as string,
            status: a.status as MonitoringAlert["status"],
            createdAt: a.created_at as string,
          })),
        );
        setUnreadAlertCount(data.unreadCount ?? 0);
      }
    } catch {
      // Handle error
    } finally {
      setScanning(false);
    }
  }, [setWatchlistEntities, setMonitoringAlerts, setUnreadAlertCount]);

  const handleRemoveEntity = useCallback(async (entityId: string) => {
    try {
      await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_entity", entityId }),
      });
      setWatchlistEntities(watchlistEntities.filter((e) => e.id !== entityId));
    } catch {
      // Handle error
    }
  }, [watchlistEntities, setWatchlistEntities]);

  const handlePauseEntity = useCallback(async (entityId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    try {
      await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_entity", entityId, updates: { status: newStatus } }),
      });
      setWatchlistEntities(
        watchlistEntities.map((e) => (e.id === entityId ? { ...e, status: newStatus as WatchlistEntity["status"] } : e)),
      );
    } catch {
      // Handle error
    }
  }, [watchlistEntities, setWatchlistEntities]);

  const handleAlertAction = useCallback(async (alertId: string, action: string) => {
    try {
      await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, alertId }),
      });
      setMonitoringAlerts(
        monitoringAlerts.map((a) =>
          a.id === alertId
            ? { ...a, status: action === "dismiss_alert" ? "dismissed" as const : "acknowledged" as const }
            : a,
        ),
      );
      setUnreadAlertCount(Math.max(0, unreadAlertCount - 1));
    } catch {
      // Handle error
    }
  }, [monitoringAlerts, setMonitoringAlerts, unreadAlertCount, setUnreadAlertCount]);

  // Filter alerts
  const filteredAlerts = monitoringAlerts.filter((a) => {
    if (a.status === "dismissed") return false;
    if (alertFilter === "unread") return a.status === "unread";
    if (alertFilter === "critical") return a.severity === "critical";
    return true;
  });

  // Summary stats
  const activeEntities = watchlistEntities.filter((e) => e.status === "active");
  const lastScanTime = watchlistEntities
    .map((e) => e.lastScreenedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const riskBreakdown = {
    clean: watchlistEntities.filter((e) => e.lastResult && e.lastResult.matchCount === 0).length,
    flagged: watchlistEntities.filter((e) => e.lastResult && e.lastResult.matchCount > 0).length,
    unscreened: watchlistEntities.filter((e) => !e.lastScreenedAt).length,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif text-text-primary">Compliance Monitoring</h1>
            <p className="text-sm text-text-muted mt-1">
              Continuous screening of your trade partners against federal watchlists
            </p>
          </div>
          <button
            onClick={handleScanAll}
            disabled={scanning || activeEntities.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
            {scanning ? "Scanning..." : "Run Scan Now"}
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-4">
          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-text-muted" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Watched</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{activeEntities.length}</p>
            <p className="text-xs text-text-tertiary mt-0.5">active entities</p>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-text-muted" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Last Scan</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {lastScanTime ? formatRelativeTime(lastScanTime) : "—"}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {lastScanTime ? new Date(lastScanTime).toLocaleDateString() : "Not yet scanned"}
            </p>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn("w-4 h-4", unreadAlertCount > 0 ? "text-red-400" : "text-text-muted")} />
              <span className="text-xs text-text-muted uppercase tracking-wider">Alerts</span>
            </div>
            <p className={cn("text-2xl font-bold", unreadAlertCount > 0 ? "text-red-400" : "text-text-primary")}>
              {unreadAlertCount}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">unread alerts</p>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-text-muted" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Status</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {riskBreakdown.clean > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-text-secondary">{riskBreakdown.clean}</span>
                </span>
              )}
              {riskBreakdown.flagged > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-text-secondary">{riskBreakdown.flagged}</span>
                </span>
              )}
              {riskBreakdown.unscreened > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-text-secondary">{riskBreakdown.unscreened}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-1">clean / flagged / pending</p>
          </div>
        </div>

        {/* Alerts Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-primary">Alerts</h2>
            <div className="flex items-center gap-1">
              {(["all", "unread", "critical"] as AlertFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setAlertFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    alertFilter === f
                      ? "bg-bg-tertiary text-text-primary"
                      : "text-text-muted hover:text-text-secondary",
                  )}
                >
                  {f === "all" ? "All" : f === "unread" ? "Unread" : "Critical"}
                </button>
              ))}
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="surface-card p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-green-400/50 mx-auto mb-3" />
              <p className="text-sm text-text-secondary">All clear — no new alerts</p>
              <p className="text-xs text-text-muted mt-1">
                Your watchlisted entities are clean across all screening lists
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "surface-card border-l-4 p-4 flex items-start gap-3",
                    alert.severity === "critical"
                      ? "border-l-red-400"
                      : alert.severity === "warning"
                        ? "border-l-yellow-400"
                        : "border-l-blue-400",
                  )}
                >
                  <div className="mt-0.5">
                    {alert.severity === "critical" ? (
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    ) : alert.severity === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{alert.title}</p>
                      {alert.status === "unread" && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{alert.description}</p>
                    {alert.matchedList && (
                      <p className="text-[11px] text-text-muted mt-1 font-mono">
                        List: {alert.matchedList}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted mt-1 font-mono">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {alert.status === "unread" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleAlertAction(alert.id, "acknowledge_alert")}
                        className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
                        title="Acknowledge"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, "dismiss_alert")}
                        className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-primary">
              Watchlist ({watchlistEntities.length})
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Entity
            </button>
          </div>

          {/* Add Entity Form */}
          {showAddForm && (
            <div className="surface-card p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1 block">
                    Entity Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Bosch Rexroth AG"
                    className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1 block">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as WatchlistEntity["entityType"])}
                    className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="supplier">Supplier</option>
                    <option value="intermediary">Intermediary</option>
                    <option value="end-user">End User</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1 block">
                    Country
                  </label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="e.g., Germany"
                    className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1 block">
                    HS Codes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newHsCodes}
                    onChange={(e) => setNewHsCodes(e.target.value)}
                    placeholder="e.g., 8481.80, 8471.30"
                    className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1 block">
                  Notes
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes about this entity"
                  className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddEntity}
                  disabled={!newName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Watchlist
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {watchlistEntities.length === 0 ? (
            <div className="surface-card p-8 text-center">
              <Shield className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-text-secondary">No entities in your watchlist</p>
              <p className="text-xs text-text-muted mt-1">
                Add trade partners to monitor them against federal screening lists
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add your first entity
              </button>
            </div>
          ) : (
            <div className="surface-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary">
                    <th className="text-left text-[11px] text-text-muted uppercase tracking-wider px-4 py-3">Entity</th>
                    <th className="text-left text-[11px] text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-[11px] text-text-muted uppercase tracking-wider px-4 py-3">Country</th>
                    <th className="text-left text-[11px] text-text-muted uppercase tracking-wider px-4 py-3">Last Screened</th>
                    <th className="text-left text-[11px] text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-right text-[11px] text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlistEntities.map((entity) => {
                    const result = entity.lastResult;
                    const isClean = result && result.matchCount === 0;
                    const isFlagged = result && result.matchCount > 0;
                    const isPaused = entity.status === "paused";

                    return (
                      <tr
                        key={entity.id}
                        className="border-b border-border-primary/50 hover:bg-bg-secondary/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm text-text-primary font-medium">{entity.entityName}</p>
                          {entity.notes && (
                            <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-[200px]">
                              {entity.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-text-secondary capitalize">{entity.entityType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-text-secondary">{entity.country || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-text-muted font-mono">
                            {entity.lastScreenedAt
                              ? formatRelativeTime(entity.lastScreenedAt)
                              : "Never"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                isPaused
                                  ? "bg-gray-400"
                                  : isClean
                                    ? "bg-green-400"
                                    : isFlagged
                                      ? "bg-red-400"
                                      : "bg-gray-400",
                              )}
                            />
                            <span className="text-xs text-text-secondary">
                              {isPaused
                                ? "Paused"
                                : isClean
                                  ? "Clear"
                                  : isFlagged
                                    ? `Flagged (${result.matchCount})`
                                    : "Pending"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleScreenEntity(entity.id)}
                              disabled={scanningEntity === entity.id}
                              className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                              title="Screen Now"
                            >
                              {scanningEntity === entity.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handlePauseEntity(entity.id, entity.status)}
                              className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
                              title={isPaused ? "Resume" : "Pause"}
                            >
                              {isPaused ? (
                                <Play className="w-3.5 h-3.5" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRemoveEntity(entity.id)}
                              className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-bg-secondary/50 border border-border-primary">
          <Info className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
          <div className="text-xs text-text-muted leading-relaxed">
            <p>
              Propeller screens against the{" "}
              <span className="text-text-secondary">U.S. Consolidated Screening List</span> — 25,000+
              entities across 13 federal lists from OFAC, BIS, and State Department. Lists are updated
              daily at 5:00 AM EST by trade.gov. Automated scans run daily at 6:00 AM UTC.
            </p>
            <p className="mt-1">
              <span className="text-text-secondary">Source:</span>{" "}
              <a
                href="https://www.trade.gov/consolidated-screening-list"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                trade.gov/consolidated-screening-list
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
