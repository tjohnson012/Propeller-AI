"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUpRight,
  MessageSquare,
  Database,
  FileDown,
} from "lucide-react";
import { ChatWorkspace } from "@/components/dashboard/ChatWorkspace";
import { cn } from "@/lib/utils";

interface Overview {
  csl: { source: "live" | "cached" | "fallback"; entries: number; loadedAt: string };
  watchlist: { total: number; flagged: number; unscreened: number; lastScan: string | null };
  alerts: {
    unread: number;
    recent: Array<{
      id: string;
      severity: string;
      title: string;
      description: string;
      createdAt: string;
      status: string;
      matchedList?: string;
    }>;
  };
}

interface ScreenResult {
  query: string;
  matched: boolean;
  matchScore: number;
  matchType: string;
  matches: Array<{
    entry: { name: string; sourceList: string; program: string; country: string };
    score: number;
    matchType: string;
  }>;
  dataSource: "live" | "cached" | "fallback";
  entriesChecked: number;
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function CompliancePage() {
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [screening, setScreening] = useState(false);
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await fetch("/api/compliance/overview", { cache: "no-store" });
      if (res.ok) setOverview(await res.json());
    } catch {
      // ignore
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleScreen = useCallback(async () => {
    const query = entity.trim();
    if (!query || screening) return;
    setScreening(true);
    setScreenError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compliance/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: query }),
      });
      if (!res.ok) throw new Error("Screening request failed");
      setResult(await res.json());
    } catch (err) {
      setScreenError(err instanceof Error ? err.message : "Screening failed");
    } finally {
      setScreening(false);
    }
  }, [entity, screening]);

  if (view === "chat") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border-primary px-6 py-2 flex items-center justify-between bg-bg-secondary/30">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Scale className="w-3.5 h-3.5 text-agent-compliance" />
            <span>Compliance — chat</span>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
        <ChatWorkspace agentContext="compliance" />
      </div>
    );
  }

  const csl = overview?.csl;
  const wl = overview?.watchlist;
  const alerts = overview?.alerts;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-agent-compliance mb-1">
              <Scale className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Compliance</span>
            </div>
            <h1 className="text-2xl font-serif text-text-primary">Trade Compliance</h1>
            <p className="text-sm text-text-secondary mt-1">
              Screen buyers, suppliers, and consignees against 13 U.S. federal restricted-party lists in real time.
            </p>
          </div>
          <button
            onClick={() => setView("chat")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-xs text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ask an agent
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="CSL Data"
            loading={overviewLoading}
            value={csl ? csl.entries.toLocaleString() : "—"}
            hint={csl ? cslHint(csl) : ""}
            tone={csl?.source === "fallback" ? "warn" : csl?.source === "live" ? "good" : "neutral"}
            icon={Database}
          />
          <StatCard
            label="Watching"
            loading={overviewLoading}
            value={wl ? String(wl.total) : "—"}
            hint={wl && wl.unscreened > 0 ? `${wl.unscreened} unscreened` : "all screened"}
            icon={Shield}
            tone="neutral"
          />
          <StatCard
            label="Flagged"
            loading={overviewLoading}
            value={wl ? String(wl.flagged) : "—"}
            hint={wl?.flagged ? "review required" : "none"}
            icon={AlertTriangle}
            tone={wl?.flagged ? "warn" : "good"}
          />
          <StatCard
            label="Alerts"
            loading={overviewLoading}
            value={alerts ? String(alerts.unread) : "—"}
            hint={alerts?.unread ? "unread" : "all read"}
            icon={AlertTriangle}
            tone={alerts?.unread ? "warn" : "good"}
          />
        </div>

        {/* Inline entity screener */}
        <section className="surface-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Screen an entity</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Run a buyer, supplier, or end-user name against OFAC SDN, BIS Entity List, Denied Persons, Unverified List, ITAR Debarred, and 8 more.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScreen()}
              placeholder="e.g. Bosch Rexroth AG, Huawei Technologies, Kaspersky Lab..."
              className="input-field flex-1 px-3 py-2.5 text-sm"
            />
            <button
              onClick={handleScreen}
              disabled={!entity.trim() || screening}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                entity.trim() && !screening
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-bg-tertiary text-text-muted",
              )}
            >
              {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Screen
            </button>
          </div>

          {screenError && (
            <div className="mt-3 text-xs text-red-400">{screenError}</div>
          )}

          {result && (
            <div className="mt-4 border-t border-border-primary pt-4">
              <div className="flex items-center gap-2 mb-2">
                {result.matched ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                )}
                <span className="text-sm font-medium text-text-primary">
                  {result.matched
                    ? `${result.matches.length} potential match${result.matches.length > 1 ? "es" : ""} found`
                    : "No matches found — cleared"}
                </span>
                <span className="ml-auto text-[11px] font-mono text-text-muted">
                  {result.entriesChecked.toLocaleString()} entries ·{" "}
                  {result.dataSource === "fallback" ? "⚠ offline sample" : result.dataSource}
                </span>
              </div>

              {result.matched && (
                <div className="space-y-2">
                  {result.matches.slice(0, 5).map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-tertiary/50 border border-amber-500/15"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">{m.entry.name}</p>
                        <p className="text-[11px] text-text-muted">
                          {m.entry.sourceList}
                          {m.entry.country ? ` · ${m.entry.country}` : ""}
                          {m.entry.program ? ` · ${m.entry.program}` : ""}
                        </p>
                      </div>
                      <div className="text-xs font-mono text-text-secondary shrink-0 ml-3">
                        {Math.round(m.score * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!result.matched && (
                <p className="text-xs text-text-secondary">
                  &ldquo;{result.query}&rdquo; did not match any entity on the Consolidated Screening List. This result is
                  a point-in-time check — add the entity to your watchlist for daily automated re-screening.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Alerts + Quick actions row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <section className="surface-card p-5 md:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">Recent alerts</h2>
              <Link
                href="/dashboard/monitoring"
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Monitoring <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {overviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
              </div>
            ) : alerts && alerts.recent.length > 0 ? (
              <div className="space-y-2">
                {alerts.recent.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-bg-tertiary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">{a.title}</p>
                      <p className="text-[11px] text-text-muted truncate">
                        {a.description}
                        {a.matchedList ? ` · ${a.matchedList}` : ""}
                      </p>
                    </div>
                    <SeverityPill severity={a.severity} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-text-muted/40 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No alerts right now</p>
                <p className="text-xs text-text-muted mt-1">
                  Your watchlist re-screens nightly. Changes to screening-list status land here.
                </p>
              </div>
            )}
          </section>

          <section className="surface-card p-5 md:col-span-2">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Quick actions</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/monitoring"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
              >
                <Shield className="w-4 h-4 text-agent-compliance" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">Manage watchlist</p>
                  <p className="text-[11px] text-text-muted">Add entities, re-screen all</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
              >
                <FileDown className="w-4 h-4 text-text-secondary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">Connect Slack alerts</p>
                  <p className="text-[11px] text-text-muted">Daily re-screen results → your channel</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              {wl?.lastScan && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-tertiary/30">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary">Last sweep</p>
                    <p className="text-[11px] text-text-muted">{formatRelativeTime(wl.lastScan)}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer — data sources */}
        <div className="text-[11px] text-text-muted leading-relaxed px-1">
          Data: U.S. Consolidated Screening List (trade.gov), updated daily at 5:00 AM EST. Covers OFAC SDN,
          Sectoral Sanctions, Foreign Sanctions Evaders, CMIC; BIS Entity List, Denied Persons, Unverified,
          Military End User; State Dept ITAR Debarred, Nonproliferation Sanctions, and 3 additional lists.
        </div>
      </div>
    </div>
  );
}

function cslHint(csl: { source: string; loadedAt: string }): string {
  if (csl.source === "fallback") return "offline sample";
  if (csl.source === "cached") return `cached · ${formatRelativeTime(csl.loadedAt)}`;
  return `live · ${formatRelativeTime(csl.loadedAt)}`;
}

type Tone = "good" | "warn" | "neutral";

function StatCard({
  label,
  value,
  hint,
  loading,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  icon: React.ElementType;
  tone: Tone;
}) {
  const toneClass = {
    good: "text-accent",
    warn: "text-amber-400",
    neutral: "text-text-secondary",
  }[tone];

  return (
    <div className="surface-card px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono">{label}</span>
        <Icon className={cn("w-3.5 h-3.5", toneClass)} />
      </div>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <div className="w-16 h-6 bg-bg-tertiary rounded animate-pulse" />
        ) : (
          <span className="text-xl font-semibold text-text-primary">{value}</span>
        )}
      </div>
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const config = s === "critical"
    ? { label: "Critical", cls: "text-red-400 bg-red-500/10 border-red-500/20" }
    : s === "warning" || s === "high"
    ? { label: s === "high" ? "High" : "Warning", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" }
    : { label: "Info", cls: "text-text-secondary bg-bg-tertiary border-border-primary" };
  return (
    <span className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border shrink-0", config.cls)}>
      {config.label}
    </span>
  );
}
