"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Calculator,
  Landmark,
  FileText,
  Loader2,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  ExternalLink,
  Info,
} from "lucide-react";
import { ChatWorkspace } from "@/components/dashboard/ChatWorkspace";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface TariffResponse {
  hsCode: string;
  country: string;
  hsDescription: string | null;
  usGeneralDuty: string | null;
  rates: Array<{
    mfnRate?: string;
    preferentialRate?: string;
    ftaName?: string;
    phaseOutSchedule?: string;
    finalRate?: string;
    finalYear?: number;
    source: string;
  }>;
}

const FTA_COUNTRIES = new Set([
  "australia", "bahrain", "canada", "chile", "colombia", "costa rica",
  "dominican republic", "el salvador", "guatemala", "honduras", "israel",
  "jordan", "south korea", "korea", "mexico", "morocco", "nicaragua",
  "oman", "panama", "peru", "singapore",
]);

const FTA_LABEL: Record<string, string> = {
  canada: "USMCA", mexico: "USMCA",
  australia: "US-Australia FTA", "south korea": "KORUS", korea: "KORUS",
  colombia: "US-Colombia TPA", chile: "US-Chile FTA", peru: "US-Peru TPA",
  singapore: "US-Singapore FTA", israel: "US-Israel FTA", jordan: "US-Jordan FTA",
  bahrain: "US-Bahrain FTA", oman: "US-Oman FTA", morocco: "US-Morocco FTA",
  panama: "US-Panama TPA", "costa rica": "CAFTA-DR", "dominican republic": "CAFTA-DR",
  "el salvador": "CAFTA-DR", guatemala: "CAFTA-DR", honduras: "CAFTA-DR",
  nicaragua: "CAFTA-DR",
};

function ftaFor(country: string): string | null {
  const key = country.toLowerCase();
  for (const [k, v] of Object.entries(FTA_LABEL)) {
    if (key.includes(k)) return v;
  }
  return null;
}

export default function FinancePage() {
  const productProfile = useAppStore((s) => s.productProfile);
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");
  const [hsCode, setHsCode] = useState("");
  const [country, setCountry] = useState("");
  const [tariff, setTariff] = useState<TariffResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Default the country picker to the user's first target market, if any
  useEffect(() => {
    if (!country && productProfile?.targetMarkets?.[0]) {
      setCountry(productProfile.targetMarkets[0]);
    }
  }, [country, productProfile]);

  const handleCalc = useCallback(async () => {
    const hs = hsCode.trim();
    const c = country.trim();
    if (!hs || !c || calcLoading) return;
    setCalcLoading(true);
    setCalcError(null);
    setTariff(null);
    try {
      const res = await fetch(`/api/finance/tariff?hs=${encodeURIComponent(hs)}&country=${encodeURIComponent(c)}`);
      if (!res.ok) throw new Error("Lookup failed");
      setTariff(await res.json());
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setCalcLoading(false);
    }
  }, [hsCode, country, calcLoading]);

  const ftaCards = useMemo(() => {
    const markets = productProfile?.targetMarkets ?? [];
    return markets.slice(0, 6).map((m) => ({
      country: m,
      fta: ftaFor(m),
      hasFta: FTA_COUNTRIES.has(m.toLowerCase()) || !!ftaFor(m),
    }));
  }, [productProfile]);

  if (view === "chat") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border-primary px-6 py-2 flex items-center justify-between bg-bg-secondary/30">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Receipt className="w-3.5 h-3.5 text-agent-finance" />
            <span>Finance — chat</span>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
        <ChatWorkspace agentContext="finance" />
      </div>
    );
  }

  const mfn = tariff?.rates.find((r) => r.mfnRate);
  const pref = tariff?.rates.find((r) => r.preferentialRate);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-agent-finance mb-1">
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Finance</span>
            </div>
            <h1 className="text-2xl font-serif text-text-primary">Export Finance</h1>
            <p className="text-sm text-text-secondary mt-1">
              Duty rates, FTA eligibility, payment terms, and grant programs for your target markets.
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

        {/* Duty calculator */}
        <section className="surface-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-agent-finance" />
            <h2 className="text-sm font-semibold text-text-primary">Duty & tariff lookup</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Looks up the MFN rate from World Bank WITS and any preferential rate from the trade.gov FTA Tariff Rates API. Accepts 6-, 8-, or 10-digit codes — rates are keyed off the 6-digit heading, but for actual customs filings use your full{" "}
            <a
              href="https://hts.usitc.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              10-digit HTSUS
            </a>
            .
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              type="text"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              placeholder="HS code (e.g. 8481.80 or 8481)"
              className="input-field px-3 py-2.5 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCalc()}
            />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Destination country"
              className="input-field px-3 py-2.5 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCalc()}
            />
            <button
              onClick={handleCalc}
              disabled={!hsCode.trim() || !country.trim() || calcLoading}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                hsCode.trim() && country.trim() && !calcLoading
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-bg-tertiary text-text-muted",
              )}
            >
              {calcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Look up
            </button>
          </div>

          {calcError && <p className="mt-3 text-xs text-red-400">{calcError}</p>}

          {tariff && (
            <div className="mt-4 border-t border-border-primary pt-4 space-y-3">
              {tariff.hsDescription && (
                <p className="text-xs text-text-muted">
                  <span className="font-mono text-text-secondary">{tariff.hsCode}</span> — {tariff.hsDescription}
                </p>
              )}

              {tariff.rates.length === 0 ? (
                <div className="flex items-start gap-2 text-xs text-text-muted">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p>
                    No live rate retrieved for this HS line in {tariff.country}. Verify on{" "}
                    <a
                      href="https://hts.usitc.gov/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      USITC HTS
                    </a>
                    {" "}or your local tariff authority. {tariff.usGeneralDuty ? `US general rate is ${tariff.usGeneralDuty}, but destination rates differ.` : ""}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <RateCard
                    label="MFN rate"
                    rate={mfn?.mfnRate ?? "not retrieved"}
                    source={mfn?.source ?? "World Bank WITS"}
                    tone="neutral"
                  />
                  <RateCard
                    label="Preferential rate"
                    rate={pref?.preferentialRate ?? (ftaFor(tariff.country) ? "verify RoO" : "N/A")}
                    source={pref ? `${pref.ftaName ?? "FTA"} — ${pref.source}` : (ftaFor(tariff.country) ? `${ftaFor(tariff.country)} — rules of origin apply` : "no applicable FTA")}
                    tone={pref ? "good" : "neutral"}
                    footnote={pref?.finalRate && pref.finalYear ? `Phases to ${pref.finalRate} by ${pref.finalYear}` : undefined}
                  />
                </div>
              )}

              <p className="text-[11px] text-text-muted leading-relaxed">
                <strong className="text-text-secondary">Rules of origin.</strong> Preferential rates apply only when
                your product meets the agreement&rsquo;s rules of origin. Regional value content, tariff-shift, and
                textile-specific rules vary. Claiming preference without qualifying can trigger duty reclamation
                and penalties. Confirm RoO at{" "}
                <a
                  href="https://www.cbp.gov/trade/priority-issues/trade-agreements"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  CBP Trade Agreements
                </a>
                .
              </p>
            </div>
          )}
        </section>

        {/* FTA status for user's markets */}
        {ftaCards.length > 0 && (
          <section className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-agent-finance" />
              <h2 className="text-sm font-semibold text-text-primary">FTA coverage — your target markets</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ftaCards.map((c) => (
                <div
                  key={c.country}
                  className="px-3 py-3 rounded-lg bg-bg-tertiary/50 border border-border-primary"
                >
                  <p className="text-sm text-text-primary">{c.country}</p>
                  {c.hasFta ? (
                    <p className="text-[11px] text-accent mt-1">{c.fta} — RoO-dependent</p>
                  ) : (
                    <p className="text-[11px] text-text-muted mt-1">No applicable US FTA — MFN rates apply</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Programs */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Landmark className="w-4 h-4 text-agent-finance" />
            <h2 className="text-sm font-semibold text-text-primary">Financing programs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ProgramCard
              title="SBA STEP Grant"
              description="Reimbursement for trade-show attendance, translated marketing, website localization, and compliance costs. Amounts vary by state."
              href="https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step"
              tag="Grant"
            />
            <ProgramCard
              title="Ex-Im Bank Working Capital Guarantee"
              description="90% guarantee on working-capital loans backing export orders. Enables your bank to extend more favorable terms."
              href="https://www.exim.gov/what-we-do/working-capital"
              tag="Guarantee"
            />
            <ProgramCard
              title="Ex-Im Export Credit Insurance"
              description="Protects against buyer non-payment from commercial or political risk. Small-business policies start around $500/yr."
              href="https://www.exim.gov/what-we-do/export-credit-insurance"
              tag="Insurance"
            />
          </div>
        </section>

        {/* Payment terms reference */}
        <section className="surface-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-agent-finance" />
            <h2 className="text-sm font-semibold text-text-primary">Payment terms — quick reference</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="px-3 py-3 rounded-lg bg-bg-tertiary/50">
              <p className="text-text-primary">New buyer, first order</p>
              <p className="text-xs text-text-muted mt-1">
                Irrevocable Letter of Credit at sight. LC fees typically 0.8–1.2% of invoice value.
              </p>
            </div>
            <div className="px-3 py-3 rounded-lg bg-bg-tertiary/50">
              <p className="text-text-primary">Established buyer (3+ orders)</p>
              <p className="text-xs text-text-muted mt-1">
                Documentary Collection (D/P) or Open Account with Ex-Im credit insurance.
              </p>
            </div>
            <div className="px-3 py-3 rounded-lg bg-bg-tertiary/50">
              <p className="text-text-primary">Emerging market, any buyer</p>
              <p className="text-xs text-text-muted mt-1">
                Cash-in-Advance or Confirmed LC. USD-denominated contracts for FX stability.
              </p>
            </div>
            <div className="px-3 py-3 rounded-lg bg-bg-tertiary/50">
              <p className="text-text-primary">OECD buyers, known entity</p>
              <p className="text-xs text-text-muted mt-1">
                Net 30–60 on open account is acceptable with insurance or factoring.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RateCard({
  label,
  rate,
  source,
  tone,
  footnote,
}: {
  label: string;
  rate: string;
  source: string;
  tone: "good" | "neutral";
  footnote?: string;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border",
        tone === "good" ? "bg-accent-muted border-accent/20" : "bg-bg-tertiary/50 border-border-primary",
      )}
    >
      <p className="text-[11px] uppercase tracking-wider text-text-muted font-mono">{label}</p>
      <p className="text-xl font-semibold text-text-primary mt-1">{rate}</p>
      <p className="text-[11px] text-text-muted mt-1">{source}</p>
      {footnote && <p className="text-[11px] text-text-secondary mt-1">{footnote}</p>}
    </div>
  );
}

function ProgramCard({
  title,
  description,
  href,
  tag,
}: {
  title: string;
  description: string;
  href: string;
  tag: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="surface-card p-4 hover:border-border-hover transition-colors group block"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary">
          {tag}
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
      <div className="flex items-center gap-1 mt-2 text-[11px] text-agent-finance opacity-0 group-hover:opacity-100 transition-opacity">
        Learn more <ArrowRight className="w-3 h-3" />
      </div>
    </a>
  );
}
