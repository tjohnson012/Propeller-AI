"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Scale,
  Compass,
  Receipt,
  Handshake,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  MapPin,
  Target,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ChatWorkspace } from "@/components/dashboard/ChatWorkspace";
import { cn } from "@/lib/utils";

interface HomeData {
  compliance: {
    csl: { source: string; entries: number; loadedAt: string };
    watchlist: { total: number; flagged: number; unscreened: number; lastScan: string | null };
    alerts: {
      unread: number;
      recent: Array<{
        id: string;
        severity: string;
        title: string;
        description: string;
        createdAt: string;
        matchedList?: string;
      }>;
    };
  } | null;
  tradeEvents: Array<{
    id: string;
    name: string;
    start_date: string;
    city?: string;
    country: string;
    industries: string[];
  }>;
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const setupComplete = useAppStore((s) => s.setupComplete);
  const productProfile = useAppStore((s) => s.productProfile);
  const messages = useAppStore((s) => s.messages);

  const [data, setData] = useState<HomeData>({ compliance: null, tradeEvents: [] });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!setupComplete) return;
    setLoading(true);

    try {
      const [compRes, eventsRes] = await Promise.allSettled([
        fetch("/api/compliance/overview", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        (async () => {
          const countries = (productProfile?.targetMarkets ?? []).slice(0, 3);
          const params = new URLSearchParams();
          params.set("limit", "6");
          if (countries[0]) params.set("country", countries[0]);
          const r = await fetch(`/api/trade-events?${params.toString()}`);
          return r.ok ? r.json() : { events: [] };
        })(),
      ]);

      setData({
        compliance: compRes.status === "fulfilled" ? compRes.value : null,
        tradeEvents: eventsRes.status === "fulfilled" ? eventsRes.value.events ?? [] : [],
      });
    } finally {
      setLoading(false);
    }
  }, [setupComplete, productProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Before setup — keep the existing onboarding flow from ChatWorkspace.
  // Also keep chat as the surface once a conversation is active.
  if (!setupComplete || messages.length > 0) {
    return <ChatWorkspace agentContext={null} />;
  }

  const comp = data.compliance;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome header */}
        <div>
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-serif text-text-primary">
            {productProfile ? `Welcome back, ${productProfile.companyName}` : "Welcome back"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&rsquo;s what&rsquo;s happening across your export operations today.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HomeStat
            label="Watchlist"
            value={comp ? String(comp.watchlist.total) : loading ? "…" : "0"}
            hint={comp?.watchlist.unscreened ? `${comp.watchlist.unscreened} unscreened` : "all screened"}
            icon={Shield}
            tone="neutral"
            href="/dashboard/monitoring"
          />
          <HomeStat
            label="Alerts"
            value={comp ? String(comp.alerts.unread) : loading ? "…" : "0"}
            hint={comp?.alerts.unread ? "unread" : "all read"}
            icon={AlertTriangle}
            tone={comp?.alerts.unread ? "warn" : "good"}
            href="/dashboard/compliance"
          />
          <HomeStat
            label="CSL data"
            value={comp ? comp.csl.entries.toLocaleString() : loading ? "…" : "—"}
            hint={comp ? cslHint(comp.csl) : ""}
            icon={CheckCircle2}
            tone={comp?.csl.source === "fallback" ? "warn" : "good"}
            href="/dashboard/compliance"
          />
          <HomeStat
            label="Trade events"
            value={data.tradeEvents.length ? String(data.tradeEvents.length) : loading ? "…" : "0"}
            hint={data.tradeEvents.length ? "upcoming for your markets" : "browse directory"}
            icon={Calendar}
            tone="neutral"
            href="/dashboard/trade-events"
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left — primary actions + alerts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick actions */}
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-3 px-1">Jump back in</h2>
              <div className="grid grid-cols-2 gap-3">
                <ActionTile
                  href="/dashboard/market-research"
                  icon={Compass}
                  iconColor="text-agent-market"
                  iconBg="bg-agent-market-muted"
                  title="Market research"
                  description="Classify products, size global demand, find target markets."
                />
                <ActionTile
                  href="/dashboard/compliance"
                  icon={Scale}
                  iconColor="text-agent-compliance"
                  iconBg="bg-agent-compliance-muted"
                  title="Compliance"
                  description="Screen buyers against 13 federal restricted-party lists."
                />
                <ActionTile
                  href="/dashboard/outreach"
                  icon={Handshake}
                  iconColor="text-agent-outreach"
                  iconBg="bg-agent-outreach-muted"
                  title="Outreach"
                  description="Culturally-tuned email drafts and follow-up cadence."
                />
                <ActionTile
                  href="/dashboard/finance"
                  icon={Receipt}
                  iconColor="text-agent-finance"
                  iconBg="bg-agent-finance-muted"
                  title="Finance"
                  description="Duty lookup, FTA status, grants, and payment terms."
                />
              </div>
            </section>

            {/* Recent alerts */}
            <section className="surface-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-primary">Compliance alerts</h2>
                <Link
                  href="/dashboard/monitoring"
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Monitoring <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                </div>
              ) : comp && comp.alerts.recent.length > 0 ? (
                <div className="space-y-2">
                  {comp.alerts.recent.slice(0, 4).map((a) => (
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
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-6 h-6 text-text-muted/40 mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">All clear</p>
                  <p className="text-xs text-text-muted mt-1">
                    We&rsquo;ll notify you here when a watchlist entity changes status.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right — profile + upcoming events */}
          <div className="space-y-4">
            {/* Profile card */}
            {productProfile && (
              <section className="surface-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-primary">Your export profile</h2>
                  <Link
                    href="/dashboard/settings"
                    className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  >
                    Edit
                  </Link>
                </div>
                <div className="space-y-2.5 text-sm">
                  <ProfileRow label="Company" value={productProfile.companyName} />
                  <ProfileRow label="Category" value={productProfile.category || "—"} />
                  {productProfile.products && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-text-muted font-mono mb-1">
                        Products
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {productProfile.products}
                      </p>
                    </div>
                  )}
                  {productProfile.targetMarkets && productProfile.targetMarkets.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-text-muted font-mono mb-1.5">
                        Target markets
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {productProfile.targetMarkets.map((m) => (
                          <span
                            key={m}
                            className="text-[11px] text-text-secondary px-2 py-0.5 rounded-full bg-bg-tertiary"
                          >
                            <Target className="w-2.5 h-2.5 inline-block mr-1" />
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Upcoming trade events */}
            <section className="surface-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-primary">Upcoming shows</h2>
                <Link
                  href="/dashboard/trade-events"
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Directory <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                </div>
              ) : data.tradeEvents.length > 0 ? (
                <div className="space-y-2">
                  {data.tradeEvents.slice(0, 4).map((e) => (
                    <Link
                      key={e.id}
                      href={`/dashboard/trade-events?q=${encodeURIComponent(e.name)}`}
                      className="block px-3 py-2.5 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
                    >
                      <p className="text-sm text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                        {e.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatEventDate(e.start_date)}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {e.city || e.country}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Calendar className="w-6 h-6 text-text-muted/40 mx-auto mb-2" />
                  <p className="text-xs text-text-muted">Browse the directory to find shows in your markets</p>
                </div>
              )}
            </section>

            {/* Start a conversation */}
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const input = document.querySelector<HTMLTextAreaElement>("[data-tour=chat-input] textarea, [data-tour=chat-input] input");
                input?.focus();
              }}
              className="surface-card p-4 hover:border-border-hover transition-colors group block"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">Ask an agent</p>
                  <p className="text-xs text-text-muted mt-0.5">Describe what you need and we&rsquo;ll route it.</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </div>

        {/* Empty message for chat input area */}
        <div className="h-4" />
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

function HomeStat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tone: Tone;
  href: string;
}) {
  const toneClass = {
    good: "text-accent",
    warn: "text-amber-400",
    neutral: "text-text-secondary",
  }[tone];

  return (
    <Link
      href={href}
      className="surface-card px-4 py-3.5 hover:border-border-hover transition-colors group block"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono">{label}</span>
        <Icon className={cn("w-3.5 h-3.5 transition-transform group-hover:scale-110", toneClass)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-text-primary">{value}</span>
      </div>
      {hint && <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{hint}</p>}
    </Link>
  );
}

function ActionTile({
  href,
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="surface-card p-4 hover:border-border-hover transition-colors group block"
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <ArrowUpRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">{description}</p>
    </Link>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono pt-0.5">{label}</span>
      <span className="text-sm text-text-primary text-right min-w-0 truncate">{value}</span>
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
