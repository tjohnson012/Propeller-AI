"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Handshake,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Globe,
  ArrowUpRight,
  Info,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ChatWorkspace } from "@/components/dashboard/ChatWorkspace";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type RelationshipStage = "initial" | "follow-up" | "value-add" | "reengage";

interface CountryStyle {
  greeting: string;
  opening: string;
  closing: string;
  signoff: string;
  notes: string;
}

const STYLES: Record<string, CountryStyle> = {
  default: {
    greeting: "Dear Sir/Madam,",
    opening: "I hope this message finds you well. I'm reaching out to introduce our company and explore potential business opportunities.",
    closing: "I'd welcome the chance to discuss further. What does your calendar look like this week?",
    signoff: "Best regards,",
    notes: "Direct, friendly, outcome-oriented. Short subject line.",
  },
  germany: {
    greeting: "Sehr geehrte Damen und Herren,",
    opening: "I am writing to introduce our company and explore potential business opportunities.",
    closing: "I would welcome the opportunity to discuss this further. Would a brief call be convenient?",
    signoff: "Mit freundlichen Grüßen,",
    notes: "Formal, precise, specification-first. Avoid superlatives; lead with technical detail and quality standards.",
  },
  austria: {
    greeting: "Sehr geehrte Damen und Herren,",
    opening: "I am writing to introduce our company and explore potential business opportunities.",
    closing: "I would welcome the opportunity to discuss this further.",
    signoff: "Mit freundlichen Grüßen,",
    notes: "Formal tone, precise language, lead with credentials.",
  },
  japan: {
    greeting: "Dear Sir/Madam,",
    opening: "I hope this message finds you well. I am writing to respectfully introduce our company and explore a potential business relationship.",
    closing: "We would be honored to discuss this opportunity at your convenience.",
    signoff: "With kind regards,",
    notes: "Highly formal, deferential. Lead with company history and references. Avoid hard sells.",
  },
  "south korea": {
    greeting: "Dear Sir/Madam,",
    opening: "I hope this message finds you well. I am writing to respectfully introduce our company and explore a potential business relationship.",
    closing: "We would be honored to discuss this opportunity at your convenience.",
    signoff: "With kind regards,",
    notes: "Formal, hierarchical. Name + title matter. Reference your company's history.",
  },
  mexico: {
    greeting: "Estimado/a señor/señora,",
    opening: "I hope this message finds you well. I am reaching out to introduce our company and explore a potential commercial partnership.",
    closing: "Would you have availability for a brief introductory call?",
    signoff: "Saludos cordiales,",
    notes: "Relationship-forward. A warm tone and personal introduction help more than a spec sheet.",
  },
  brazil: {
    greeting: "Prezados,",
    opening: "I hope this message finds you well. I am reaching out to introduce our company and explore a potential commercial partnership.",
    closing: "I would appreciate the chance to discuss this in a brief call.",
    signoff: "Atenciosamente,",
    notes: "Warm, relationship-first. Portuguese-language follow-ups land much better than English-only.",
  },
  france: {
    greeting: "Madame, Monsieur,",
    opening: "I am writing to introduce our company and explore potential business opportunities.",
    closing: "I would welcome the opportunity to discuss this further.",
    signoff: "Cordialement,",
    notes: "Formal. Start with French greeting even if email continues in English. Lead with capability and heritage.",
  },
  netherlands: {
    greeting: "Geachte heer/mevrouw,",
    opening: "I'm reaching out to introduce our company and explore potential business opportunities.",
    closing: "Happy to set up a brief call — any preferred times next week?",
    signoff: "Met vriendelijke groet,",
    notes: "Direct like English, but formal greeting. Dutch buyers value honesty and no-nonsense numbers.",
  },
};

function styleFor(country: string): CountryStyle {
  const key = country.toLowerCase().trim();
  for (const [k, v] of Object.entries(STYLES)) {
    if (k !== "default" && key.includes(k)) return v;
  }
  return STYLES.default;
}

const STAGE_LABELS: Record<RelationshipStage, string> = {
  initial: "Initial introduction",
  "follow-up": "Follow-up (day 5)",
  "value-add": "Value-add (day 14)",
  reengage: "Re-engage (day 30+)",
};

function buildEmail(params: {
  stage: RelationshipStage;
  product: string;
  companyName: string;
  country: string;
  hsCode?: string;
}): { subject: string; body: string } {
  const { stage, product, companyName, country, hsCode } = params;
  const style = styleFor(country);

  const subjectByStage: Record<RelationshipStage, string> = {
    initial: `${companyName || "Our company"} — ${product || "US-manufactured products"} for your ${country || "market"}`,
    "follow-up": `Re: ${companyName || "Our company"} — quick follow-up`,
    "value-add": `${companyName || "Our company"} — technical data sheets & references`,
    reengage: `Checking in — ${product || "our products"}`,
  };

  const bodyByStage: Record<RelationshipStage, string> = {
    initial: `${style.opening}

${companyName || "[Your company]"} is a US-based manufacturer specializing in ${product || "[your product]"}. We are expanding international operations and see strong fit for the ${country || "[market]"} market.

What we bring:
- Precision US manufacturing with full material traceability
- Competitive pricing and reliable lead times
${hsCode ? `- HS code ${hsCode} classification for streamlined customs` : "- Clean HS classification for customs efficiency"}
- Documented quality program aligned with industry standards

${style.closing}

${style.signoff}
[Your Name]
${companyName || "[Your Company]"}`,

    "follow-up": `${style.opening.replace("I am writing to introduce our company", "I wanted to briefly follow up")}

I wanted to follow up on ${companyName || "our"} ${product || "product"} capabilities. To help with evaluation I can send:

- Detailed technical specifications and data sheets
- Sample pricing for typical order volumes
- References from existing international customers
- A sample shipment for quality evaluation

Would a short call this week work to discuss your requirements?

${style.signoff}
[Your Name]`,

    "value-add": `Following up with the materials I mentioned. Attached you'll find:

- Technical datasheet for ${product || "our primary line"}
- Customer references, including clients in or near ${country || "your region"}
- Our quality and testing protocol summary

If the fit looks right, I'd propose a short technical call with your engineering team. Happy to prepare specific answers in advance — just let me know which line items are most relevant.

${style.signoff}
[Your Name]`,

    reengage: `I know things move quickly on your side. Circling back briefly to re-open the conversation about ${product || "supply for your ${country} operations"}.

Since we last connected, we've:
- Expanded our export operations team (shorter response times)
- Added additional quality certifications
- Improved lead times on our most-requested SKUs

If there's still a need, I'd welcome a 15-minute conversation. If the timing isn't right, I'll remove you from active follow-up — just reply "not now."

${style.signoff}
[Your Name]`,
  };

  const greeting = style.greeting;
  return {
    subject: subjectByStage[stage],
    body: `${greeting}\n\n${bodyByStage[stage]}`,
  };
}

export default function OutreachPage() {
  const productProfile = useAppStore((s) => s.productProfile);
  const [view, setView] = useState<"dashboard" | "chat">("dashboard");

  const [country, setCountry] = useState(productProfile?.targetMarkets?.[0] ?? "Germany");
  const [stage, setStage] = useState<RelationshipStage>("initial");
  const [product, setProduct] = useState(productProfile?.products ?? productProfile?.category ?? "");
  const [hsCode, setHsCode] = useState("");
  const [companyName] = useState(productProfile?.companyName ?? "");
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const draft = useMemo(
    () => buildEmail({ stage, product, companyName, country, hsCode }),
    [stage, product, companyName, country, hsCode],
  );

  const style = useMemo(() => styleFor(country), [country]);

  const copy = useCallback(async (text: string, which: "subject" | "body") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1200);
  }, []);

  const handleAiPersonalize = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/outreach/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          product,
          stage: STAGE_LABELS[stage],
          companyName,
          draft: draft.body,
        }),
      });
      if (!res.ok) throw new Error("Personalize failed");
      const data = await res.json();
      setAiResult(data.text || "");
    } catch (err) {
      setAiResult(`Couldn't personalize: ${err instanceof Error ? err.message : "unknown error"}. You can copy the base draft above and edit manually.`);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, country, product, stage, companyName, draft]);

  if (view === "chat") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border-primary px-6 py-2 flex items-center justify-between bg-bg-secondary/30">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Handshake className="w-3.5 h-3.5 text-agent-outreach" />
            <span>Outreach — chat</span>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
        <ChatWorkspace agentContext="outreach" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-agent-outreach mb-1">
              <Handshake className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Outreach</span>
            </div>
            <h1 className="text-2xl font-serif text-text-primary">Buyer outreach</h1>
            <p className="text-sm text-text-secondary mt-1">
              Culturally-tuned email drafts for every stage of a buyer conversation.
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

        {/* Honest banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-bg-secondary/50 border border-border-primary">
          <Info className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
          <div className="text-xs text-text-muted leading-relaxed">
            <strong className="text-text-secondary">Templates, not leads.</strong> Propeller doesn&rsquo;t include a list of verified buyers — bring your own recipients from trade shows, importer directories, or LinkedIn prospecting. These drafts give you the right cultural tone and follow-up cadence to send with.
          </div>
        </div>

        {/* Draft generator */}
        <section className="surface-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-agent-outreach" />
            <h2 className="text-sm font-semibold text-text-primary">Draft an email</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <LabelInput
              label="Destination country"
              value={country}
              onChange={setCountry}
              placeholder="e.g. Germany"
            />
            <LabelInput
              label="Your product"
              value={product}
              onChange={setProduct}
              placeholder="e.g. industrial ball valves"
            />
            <LabelInput
              label="HS code (optional)"
              value={hsCode}
              onChange={setHsCode}
              placeholder="e.g. 8481.80"
            />
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-text-muted font-mono mb-1.5">
                Stage
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(STAGE_LABELS) as RelationshipStage[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={cn(
                      "px-2.5 py-2 rounded-md text-xs transition-colors text-left",
                      stage === s
                        ? "bg-agent-outreach-muted text-text-primary border border-agent-outreach/40"
                        : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-transparent",
                    )}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Culture note */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/50 mb-4">
            <Globe className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
            <div className="text-[11px] text-text-muted leading-relaxed">
              <strong className="text-text-secondary">{country} style:</strong> {style.notes}
            </div>
          </div>

          {/* Preview — subject */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Subject</label>
              <button
                onClick={() => copy(draft.subject, "subject")}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
              >
                {copied === "subject" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === "subject" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="input-field px-3 py-2 text-sm text-text-primary">{draft.subject}</div>
          </div>

          {/* Preview — body */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider text-text-muted font-mono">Body</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAiPersonalize}
                  disabled={aiLoading}
                  className="flex items-center gap-1 text-[11px] text-agent-outreach hover:text-accent-hover transition-colors"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiLoading ? "Personalizing…" : "Personalize with AI"}
                </button>
                <button
                  onClick={() => copy(draft.body, "body")}
                  className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  {copied === "body" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === "body" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="input-field px-3 py-3 text-sm text-text-primary whitespace-pre-wrap font-normal min-h-[220px]">
              {draft.body}
            </div>
          </div>

          {aiResult && (
            <div className="mt-3 border-t border-border-primary pt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] uppercase tracking-wider text-agent-outreach font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI-personalized
                </label>
                <button
                  onClick={() => copy(aiResult, "body")}
                  className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <div className="px-3 py-3 rounded-lg bg-agent-outreach-muted border border-agent-outreach/20 text-sm text-text-primary whitespace-pre-wrap">
                {aiResult}
              </div>
            </div>
          )}
        </section>

        {/* Follow-up cadence reference */}
        <section className="surface-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-agent-outreach" />
            <h2 className="text-sm font-semibold text-text-primary">Follow-up cadence</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <CadenceCard day="Day 1" action="Initial introduction email" channel="Email" />
            <CadenceCard day="Day 5" action="Follow-up with offer of materials" channel="Email" />
            <CadenceCard day="Day 10" action="LinkedIn connection request" channel="LinkedIn" />
            <CadenceCard day="Day 14" action="Value-add follow-up with datasheet or reference" channel="Email" />
            <CadenceCard day="Day 21" action="Phone outreach attempt" channel="Phone" />
            <CadenceCard day="Day 30+" action="Monthly industry update" channel="Email" />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/dashboard/trade-events"
            className="surface-card p-4 hover:border-border-hover transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Find trade shows</p>
                <p className="text-xs text-text-muted mt-1">Meet buyers in person — best source of verified contacts.</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
          <Link
            href="/dashboard/settings"
            className="surface-card p-4 hover:border-border-hover transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Connect Gmail</p>
                <p className="text-xs text-text-muted mt-1">Send drafts straight from your mail account.</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function LabelInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-text-muted font-mono mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field w-full px-3 py-2 text-sm"
      />
    </div>
  );
}

function CadenceCard({ day, action, channel }: { day: string; action: string; channel: string }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-bg-tertiary/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono text-agent-outreach">{day}</span>
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{channel}</span>
      </div>
      <p className="text-xs text-text-primary">{action}</p>
    </div>
  );
}
