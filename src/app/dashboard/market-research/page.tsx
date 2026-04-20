"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  Globe,
  MessageSquare,
  Loader2,
  ArrowUpRight,
  Package,
  Target,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { ChatWorkspace } from "@/components/dashboard/ChatWorkspace";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface HSSuggestion {
  code: string;
  description: string;
  generalDutyRate: string;
  confidence: number;
}

interface TradeFlow {
  hsCode: string;
  hsDescription: string;
  totalValue: number;
  isFallback: boolean;
  fallbackReason?: string;
  source: string;
  partners: Array<{
    country: string;
    tradeValue: number;
    share: number;
  }>;
}

function formatUSD(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export default function MarketResearchPage() {
  const productProfile = useAppStore((s) => s.productProfile);
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");

  // HS search state
  const [hsQuery, setHsQuery] = useState("");
  const [hsSuggestions, setHsSuggestions] = useState<HSSuggestion[] | null>(null);
  const [hsLoading, setHsLoading] = useState(false);

  // Trade flow state
  const [flowHs, setFlowHs] = useState("");
  const [flows, setFlows] = useState<TradeFlow | null>(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  const handleHsSearch = useCallback(async () => {
    const q = hsQuery.trim();
    if (!q || hsLoading) return;
    setHsLoading(true);
    setHsSuggestions(null);
    try {
      const res = await fetch("/api/market/hs-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setHsSuggestions(data.suggestions ?? []);
    } catch {
      setHsSuggestions([]);
    } finally {
      setHsLoading(false);
    }
  }, [hsQuery, hsLoading]);

  const handleFlowLookup = useCallback(async (code?: string) => {
    const hs = (code ?? flowHs).trim();
    if (!hs || flowLoading) return;
    setFlowLoading(true);
    setFlowError(null);
    setFlows(null);
    try {
      const res = await fetch("/api/market/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hsCode: hs, reporterCountry: "world", direction: "import" }),
      });
      if (!res.ok) throw new Error("Lookup failed");
      setFlows(await res.json());
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setFlowLoading(false);
    }
  }, [flowHs, flowLoading]);

  if (view === "chat") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border-primary px-6 py-2 flex items-center justify-between bg-bg-secondary/30">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Compass className="w-3.5 h-3.5 text-agent-market" />
            <span>Market Research — chat</span>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
        <ChatWorkspace agentContext="market" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-agent-market mb-1">
              <Compass className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Market Research</span>
            </div>
            <h1 className="text-2xl font-serif text-text-primary">Global market intelligence</h1>
            <p className="text-sm text-text-secondary mt-1">
              Classify your product, size global demand, and identify where to compete.
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

        {/* Profile summary */}
        {productProfile && (
          <section className="surface-card p-5">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-agent-market-muted flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-agent-market" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Your profile</p>
                <p className="text-sm text-text-primary mt-0.5">
                  <span className="font-medium">{productProfile.companyName}</span>
                  {productProfile.category && <span className="text-text-secondary"> · {productProfile.category}</span>}
                </p>
                {productProfile.products && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{productProfile.products}</p>
                )}
                {productProfile.targetMarkets && productProfile.targetMarkets.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Target className="w-3 h-3 text-text-muted" />
                    {productProfile.targetMarkets.slice(0, 6).map((m) => (
                      <span
                        key={m}
                        className="text-[11px] text-text-secondary px-2 py-0.5 rounded-full bg-bg-tertiary"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/dashboard/settings"
                className="text-xs text-text-muted hover:text-text-primary transition-colors whitespace-nowrap"
              >
                Edit →
              </Link>
            </div>
          </section>
        )}

        {/* HS Code Search */}
        <section className="surface-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-agent-market" />
            <h2 className="text-sm font-semibold text-text-primary">Classify your product</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Search the USITC Harmonized Tariff Schedule. We match your description against ~17,000 codes.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={hsQuery}
              onChange={(e) => setHsQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleHsSearch()}
              placeholder="e.g. industrial ball valves, electronic control units, medical diagnostic equipment..."
              className="input-field flex-1 px-3 py-2.5 text-sm"
            />
            <button
              onClick={handleHsSearch}
              disabled={!hsQuery.trim() || hsLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                hsQuery.trim() && !hsLoading
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-bg-tertiary text-text-muted",
              )}
            >
              {hsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {hsSuggestions && hsSuggestions.length === 0 && (
            <p className="mt-3 text-xs text-text-muted">
              No HS code matches. Try a more general description (e.g. &ldquo;valves&rdquo; instead of &ldquo;API 6D 6000 PSI ball valves&rdquo;).
            </p>
          )}

          {hsSuggestions && hsSuggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              {hsSuggestions.slice(0, 5).map((hs) => (
                <div
                  key={hs.code}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-bg-tertiary/50 border border-border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-agent-market">{hs.code}</span>
                      <span className="text-[10px] font-mono text-text-muted">{hs.confidence}% match</span>
                    </div>
                    <p className="text-xs text-text-secondary truncate mt-0.5">{hs.description}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">US duty rate: {hs.generalDutyRate}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFlowHs(hs.code);
                      handleFlowLookup(hs.code);
                    }}
                    className="text-xs text-accent hover:text-accent-hover transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    See trade flows <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trade flows */}
        <section className="surface-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-agent-market" />
            <h2 className="text-sm font-semibold text-text-primary">Global trade flows</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Top importers for an HS code — live UN Comtrade data when available.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={flowHs}
              onChange={(e) => setFlowHs(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFlowLookup()}
              placeholder="HS code (e.g. 8481)"
              className="input-field flex-1 px-3 py-2.5 text-sm"
            />
            <button
              onClick={() => handleFlowLookup()}
              disabled={!flowHs.trim() || flowLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                flowHs.trim() && !flowLoading
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-bg-tertiary text-text-muted",
              )}
            >
              {flowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Look up
            </button>
          </div>

          {flowError && <p className="mt-3 text-xs text-red-400">{flowError}</p>}

          {flows && (
            <div className="mt-4 space-y-3">
              {flows.isFallback && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-[11px] text-amber-400/90 leading-relaxed">
                    <strong>Reference estimate.</strong> Live UN Comtrade query unavailable ({flows.fallbackReason ?? "no live data"}). Figures below are directional only — re-run when the API is reachable.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pb-3 border-b border-border-primary">
                <div>
                  <p className="text-xs text-text-muted">HS {flows.hsCode}</p>
                  <p className="text-sm text-text-primary mt-0.5">{flows.hsDescription}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Total global imports</p>
                  <p className="text-lg font-semibold text-text-primary mt-0.5">
                    {formatUSD(flows.totalValue)}
                    {flows.isFallback && <span className="text-[10px] text-text-muted ml-1">est.</span>}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                {flows.partners.slice(0, 10).map((p, i) => {
                  const widthPct = Math.min(100, (p.share / (flows.partners[0]?.share || 1)) * 100);
                  const isTarget = productProfile?.targetMarkets?.some(
                    (m) => p.country.toLowerCase().includes(m.toLowerCase()),
                  );
                  return (
                    <div key={p.country} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-text-muted w-5 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn(
                            "truncate",
                            isTarget ? "text-accent font-medium" : "text-text-primary"
                          )}>
                            {p.country}
                            {isTarget && <span className="text-[10px] ml-1">★ your target</span>}
                          </span>
                          <span className="text-text-muted font-mono shrink-0 ml-2">
                            {formatUSD(p.tradeValue)} · {p.share}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              isTarget ? "bg-accent" : "bg-agent-market/60",
                            )}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/dashboard/trade-events"
            className="surface-card p-4 hover:border-border-hover transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Trade shows directory</p>
                <p className="text-xs text-text-muted mt-1">
                  Find the right events to meet buyers in your target markets.
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
          <Link
            href="/dashboard/compliance"
            className="surface-card p-4 hover:border-border-hover transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Screen a buyer</p>
                <p className="text-xs text-text-muted mt-1">
                  Verify any prospect against 13 federal restricted-party lists.
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
