"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import { agents, agentColorMap, type AgentId } from "@/lib/constants";
import { sendChatStreaming } from "@/lib/chat-stream";
import { runPipelineStreaming } from "@/lib/pipeline-stream";
import { cn } from "@/lib/utils";
import { ChatMessageComponent } from "./ChatMessageComponent";
import { ChatInput } from "./ChatInput";
import { Loader2, ArrowRight, Compass, Scale, Receipt, Handshake, Package, Globe, Play } from "lucide-react";
import { CatalogUpload } from "./CatalogUpload";
import { productSectors } from "@/lib/onboarding-constants";
import { useOnboardingStore } from "@/lib/onboarding-store";

interface ChatWorkspaceProps {
  agentContext: AgentId | null;
}

const targetRegions = [
  { label: "Europe", markets: ["Germany", "UK", "France", "Netherlands"] },
  { label: "North America", markets: ["Canada", "Mexico"] },
  { label: "Asia Pacific", markets: ["Japan", "South Korea", "Australia"] },
  { label: "Latin America", markets: ["Brazil", "Colombia", "Chile"] },
  { label: "Middle East", markets: ["UAE", "Saudi Arabia"] },
  { label: "Not sure yet", markets: [] },
];

/* ── Setup Flow ── */
function SetupFlow() {
  const { setProductProfile } = useAppStore();
  const { startTour, tourCompleted } = useOnboardingStore();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [products, setProducts] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [launching, setLaunching] = useState(false);

  const handleComplete = useCallback(async () => {
    if (launching) return;
    setLaunching(true);

    const allMarkets = targetRegions
      .filter((r) => selectedRegions.includes(r.label))
      .flatMap((r) => r.markets);

    const categoryLabel = selectedCategory === "Other" ? customCategory || "Other" : selectedCategory;
    const profile = {
      companyName,
      category: categoryLabel,
      products,
      targetMarkets: allMarkets,
    };
    setProductProfile(profile);

    // Trigger guided tour after workspace loads (if not already completed)
    if (!tourCompleted) {
      setTimeout(() => startTour(), 2000);
    }

    // Build a clean, natural first message
    const productLabel = products || categoryLabel || "our products";
    const marketLabel = allMarkets.length > 0
      ? allMarkets.slice(0, 3).join(", ")
      : "international markets";
    const introMessage = `Find buyers for ${productLabel} in ${marketLabel}. Start with market research and compliance screening.`;

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: introMessage,
      timestamp: new Date(),
    };
    useAppStore.getState().setMessages([userMsg]);

    // Use the deterministic pipeline for structured workflows
    try {
      await runPipelineStreaming({
        companyName,
        product: products || categoryLabel || "manufacturing products",
        targetCountries: allMarkets,
      });
    } catch {
      useAppStore.getState().addMessage({
        id: `error-${Date.now()}`,
        role: "system",
        text: "Could not reach the server. Check your API key in .env.local",
        timestamp: new Date(),
      });
    } finally {
      setLaunching(false);
    }
  }, [companyName, selectedCategory, customCategory, products, selectedRegions, setProductProfile, launching, tourCompleted, startTour]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                s <= step ? "bg-accent" : "bg-bg-tertiary",
              )}
            />
          ))}
        </div>

        {/* Step 0: Company name */}
        {step === 0 && (
          <div className="animation-slide-up">
            <h2 className="font-serif text-2xl text-text-primary mb-2">
              What&apos;s your company name?
            </h2>
            <p className="text-sm text-text-secondary mb-8">
              We&apos;ll use this to personalize your export workspace.
            </p>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Midwest Valve Corp"
              className="input-field w-full px-4 py-3 text-sm mb-6"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && companyName.trim() && setStep(1)}
            />
            <button
              onClick={() => setStep(1)}
              disabled={!companyName.trim()}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                companyName.trim()
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-bg-tertiary text-text-muted",
              )}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="animation-slide-up">
            <h2 className="font-serif text-2xl text-text-primary mb-2">
              What do you manufacture?
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Select a category so we can match you with the right HS codes and buyers.
            </p>

            {/* Sector tabs */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              <button
                onClick={() => setActiveSector(null)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeSector === null
                    ? "bg-accent text-white"
                    : "bg-bg-secondary text-text-muted hover:text-text-secondary",
                )}
              >
                All
              </button>
              {productSectors.map((sector) => (
                <button
                  key={sector.name}
                  onClick={() => setActiveSector(sector.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    activeSector === sector.name
                      ? "bg-accent text-white"
                      : "bg-bg-secondary text-text-muted hover:text-text-secondary",
                  )}
                >
                  {sector.name}
                </button>
              ))}
            </div>

            {/* Category grid */}
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-4 mb-4">
              {productSectors
                .filter((s) => !activeSector || s.name === activeSector)
                .map((sector) => (
                  <div key={sector.name}>
                    {!activeSector && (
                      <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-2">
                        {sector.name}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {sector.categories.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            setSelectedCategory(cat.label);
                            if (cat.value !== "other") setStep(2);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left",
                            selectedCategory === cat.label
                              ? "border-accent bg-accent-muted text-text-primary"
                              : "border-border-primary bg-bg-secondary text-text-secondary hover:border-border-hover hover:text-text-primary",
                          )}
                        >
                          <Package className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-sm">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Custom category input for "Other" */}
            {selectedCategory === "Other" && (
              <div className="mb-4 animation-slide-up">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Describe your product category..."
                  className="input-field w-full px-3 py-2.5 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && customCategory.trim() && setStep(2)}
                />
                <button
                  onClick={() => setStep(2)}
                  disabled={!customCategory.trim()}
                  className={cn(
                    "mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    customCategory.trim()
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "bg-bg-tertiary text-text-muted",
                  )}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border-primary" />
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border-primary" />
            </div>

            {/* CSV Upload */}
            <CatalogUpload />

            <button
              onClick={() => setStep(2)}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors mt-4"
            >
              Skip this step
            </button>
          </div>
        )}

        {/* Step 2: Products */}
        {step === 2 && (
          <div className="animation-slide-up">
            <h2 className="font-serif text-2xl text-text-primary mb-2">
              Describe your products
            </h2>
            <p className="text-sm text-text-secondary mb-8">
              A short description helps our agents find the right buyers and HS codes.
            </p>
            <textarea
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              placeholder="e.g. Industrial ball valves and butterfly valves for oil & gas applications, sizes 2&quot; to 24&quot;"
              className="input-field w-full px-4 py-3 text-sm mb-6 resize-none h-28"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStep(3)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Target markets */}
        {step === 3 && (
          <div className="animation-slide-up">
            <h2 className="font-serif text-2xl text-text-primary mb-2">
              Where do you want to sell?
            </h2>
            <p className="text-sm text-text-secondary mb-8">
              Select target regions. We&apos;ll check compliance and find buyers there.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {targetRegions.map((region) => (
                <button
                  key={region.label}
                  onClick={() => {
                    setSelectedRegions((prev) =>
                      prev.includes(region.label)
                        ? prev.filter((r) => r !== region.label)
                        : [...prev, region.label],
                    );
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-lg border transition-colors text-left",
                    selectedRegions.includes(region.label)
                      ? "border-accent bg-accent-muted text-text-primary"
                      : "border-border-primary bg-bg-secondary text-text-secondary hover:border-border-hover hover:text-text-primary",
                  )}
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="text-sm">{region.label}</span>
                    {region.markets.length > 0 && (
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {region.markets.join(", ")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleComplete}
              disabled={launching}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors",
                launching
                  ? "bg-bg-tertiary text-text-muted"
                  : "bg-accent text-white hover:bg-accent-hover",
              )}
            >
              {launching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  Launch my workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── One-Click Workflows (shown after setup, when no messages) ── */
function WorkflowDashboard({ agentContext }: { agentContext: AgentId | null }) {
  const productProfile = useAppStore((s) => s.productProfile);
  const [launching, setLaunching] = useState<string | null>(null);

  const productDesc = productProfile?.products || productProfile?.category || "your products";

  const workflows = agentContext
    ? getAgentWorkflows(agentContext, productDesc)
    : [
        {
          id: "find-buyers",
          label: "Find international buyers",
          description: `Search global trade data for qualified buyers of ${productDesc}`,
          icon: Compass,
          color: "text-agent-market",
          bg: "bg-agent-market-muted",
          prompt: `Find international buyers for ${productDesc}. Search UN Comtrade trade flows, identify the top importing countries, and find qualified prospects.`,
        },
        {
          id: "screen-compliance",
          label: "Run compliance check",
          description: "Screen potential markets and entities against OFAC and BIS",
          icon: Scale,
          color: "text-agent-compliance",
          bg: "bg-agent-compliance-muted",
          prompt: `Run a comprehensive compliance check for exporting ${productDesc}. Check OFAC sanctions, BIS entity list, and export control classifications.`,
        },
        {
          id: "classify-product",
          label: "Classify my product",
          description: "Get the HS code, duty rates, and FTA eligibility",
          icon: Package,
          color: "text-accent",
          bg: "bg-accent-muted",
          prompt: `Classify ${productDesc} under the Harmonized Tariff Schedule. Give me the HS code, duty rates, and check FTA eligibility for USMCA and CETA.`,
        },
        {
          id: "explore-financing",
          label: "Explore export financing",
          description: "Find grants, payment terms, and financing programs",
          icon: Receipt,
          color: "text-agent-finance",
          bg: "bg-agent-finance-muted",
          prompt: `What export financing options are available for a small manufacturer exporting ${productDesc}? Include SBA STEP grants, Ex-Im Bank programs, and recommended payment terms.`,
        },
      ];

  const handleWorkflow = async (workflow: (typeof workflows)[0]) => {
    if (launching) return;
    setLaunching(workflow.id);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: workflow.prompt,
      timestamp: new Date(),
    };
    useAppStore.getState().setMessages([userMsg]);

    try {
      // Use deterministic pipeline for full analysis workflows
      const isPipelineWorkflow = workflow.id === "find-buyers" || workflow.id === "search-buyers" || workflow.id === "screen-compliance";
      if (isPipelineWorkflow && productProfile) {
        await runPipelineStreaming({
          companyName: productProfile.companyName,
          product: productProfile.products || productProfile.category || "manufacturing products",
          targetCountries: productProfile.targetMarkets,
        });
      } else {
        await sendChatStreaming({
          message: workflow.prompt,
          conversationHistory: [],
          contextAgent: agentContext,
        });
      }
    } catch {
      useAppStore.getState().addMessage({
        id: `err-${Date.now()}`,
        role: "system",
        text: "Failed to reach the server",
        timestamp: new Date(),
      });
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {productProfile && (
          <p className="text-xs text-text-muted font-mono mb-2">
            {productProfile.companyName}
          </p>
        )}
        <h2 className="font-serif text-2xl text-text-primary mb-2">
          What do you need?
        </h2>
        <p className="text-sm text-text-secondary mb-8">
          Pick a workflow and your agents will handle the rest.
        </p>

        <div className="space-y-3">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => handleWorkflow(wf)}
              disabled={launching !== null}
              className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl bg-bg-secondary border border-border-primary hover:border-border-hover transition-all text-left disabled:opacity-50"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", wf.bg)}>
                {launching === wf.id ? (
                  <Loader2 className={cn("w-5 h-5 animate-spin", wf.color)} />
                ) : (
                  <wf.icon className={cn("w-5 h-5", wf.color)} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                  {wf.label}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {wf.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>

        <p className="text-xs text-text-muted mt-6">
          Or type a question below to talk to your agents directly.
        </p>
      </div>
    </div>
  );
}

function getAgentWorkflows(agentId: AgentId, productDesc: string) {
  const workflows: Record<
    AgentId,
    Array<{
      id: string;
      label: string;
      description: string;
      icon: typeof Compass;
      color: string;
      bg: string;
      prompt: string;
    }>
  > = {
    market: [
      { id: "search-buyers", label: "Search for buyers", description: `Find qualified importers of ${productDesc}`, icon: Compass, color: "text-agent-market", bg: "bg-agent-market-muted", prompt: `Find qualified international buyers for ${productDesc}. Search UN Comtrade data and identify top importing countries and companies.` },
      { id: "trade-flows", label: "Analyze trade flows", description: "See which countries import your product category", icon: Globe, color: "text-agent-market", bg: "bg-agent-market-muted", prompt: `Analyze global trade flows for ${productDesc}. Show me the top importing countries, trade values, and growth trends.` },
      { id: "hs-lookup", label: "Look up HS code", description: "Find the right tariff classification", icon: Package, color: "text-agent-market", bg: "bg-agent-market-muted", prompt: `What is the HS code for ${productDesc}? Give me the full classification with duty rates.` },
    ],
    compliance: [
      { id: "screen-entity", label: "Screen an entity", description: "Check a company against OFAC and BIS", icon: Scale, color: "text-agent-compliance", bg: "bg-agent-compliance-muted", prompt: "I need to screen a potential buyer. Let me know what entity to check." },
      { id: "export-controls", label: "Check export controls", description: `Verify if ${productDesc} requires a license`, icon: Package, color: "text-agent-compliance", bg: "bg-agent-compliance-muted", prompt: `Check if ${productDesc} has any export control restrictions. What ECCN classification applies?` },
      { id: "fta-check", label: "Check FTA eligibility", description: "See which trade agreements save on duties", icon: Receipt, color: "text-agent-compliance", bg: "bg-agent-compliance-muted", prompt: `Check FTA eligibility for ${productDesc}. Which free trade agreements can reduce duties?` },
    ],
    outreach: [
      { id: "draft-email", label: "Draft outreach email", description: "Create a buyer introduction email", icon: Handshake, color: "text-agent-outreach", bg: "bg-agent-outreach-muted", prompt: `Draft an outreach email introducing ${productDesc} to a German industrial buyer. Make it professional and culturally appropriate.` },
      { id: "followup", label: "Write a follow-up", description: "Create a follow-up sequence", icon: Handshake, color: "text-agent-outreach", bg: "bg-agent-outreach-muted", prompt: `Write a follow-up email for a buyer who hasn't responded to our initial outreach about ${productDesc}.` },
    ],
    finance: [
      { id: "payment-terms", label: "Recommend payment terms", description: "Get payment structure for new buyers", icon: Receipt, color: "text-agent-finance", bg: "bg-agent-finance-muted", prompt: `What payment terms should I use for a first-time buyer of ${productDesc} in Germany? Consider risk mitigation.` },
      { id: "grants", label: "Find export grants", description: "SBA STEP and other funding", icon: Receipt, color: "text-agent-finance", bg: "bg-agent-finance-muted", prompt: `What export grants and financing programs are available for a small Ohio manufacturer exporting ${productDesc}?` },
      { id: "duties", label: "Estimate duties", description: "Calculate tariffs for target markets", icon: Package, color: "text-agent-finance", bg: "bg-agent-finance-muted", prompt: `Estimate the import duties for ${productDesc} in Germany, Canada, and Mexico. Include any FTA savings.` },
    ],
  };
  return workflows[agentId];
}

/* ── Continue Button ── */
function ContinueButton({ agentContext }: { agentContext: AgentId | null }) {
  const canContinue = useAppStore((s) => s.canContinue);
  const [continuing, setContinuing] = useState(false);

  const handleContinue = useCallback(async () => {
    if (continuing) return;
    setContinuing(true);

    const continueMsg = "Continue where you left off. Complete any remaining analysis and generate your report documents.";

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-cont`,
      role: "user",
      text: continueMsg,
      timestamp: new Date(),
    };
    useAppStore.getState().addMessage(userMsg);

    try {
      const currentMessages = useAppStore.getState().messages;
      const history = currentMessages
        .filter((m) => m.role === "user" || m.role === "agent")
        .slice(-6)
        .map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

      await sendChatStreaming({
        message: continueMsg,
        conversationHistory: history,
        contextAgent: agentContext,
      });
    } catch {
      useAppStore.getState().addMessage({
        id: `err-${Date.now()}`,
        role: "system",
        text: "Failed to continue. Try again.",
        timestamp: new Date(),
      });
    } finally {
      setContinuing(false);
    }
  }, [continuing, agentContext]);

  if (!canContinue) return null;

  return (
    <div className="flex justify-center py-3">
      <button
        onClick={handleContinue}
        disabled={continuing}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
          continuing
            ? "bg-bg-tertiary text-text-muted"
            : "bg-accent text-white hover:bg-accent-hover",
        )}
      >
        {continuing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Continuing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Continue
          </>
        )}
      </button>
    </div>
  );
}

/* ── Main Workspace ── */
export function ChatWorkspace({ agentContext }: ChatWorkspaceProps) {
  const messages = useAppStore((s) => s.messages);
  const setupComplete = useAppStore((s) => s.setupComplete);
  const setActiveWorkspaceAgent = useAppStore((s) => s.setActiveWorkspaceAgent);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveWorkspaceAgent(agentContext);
  }, [agentContext, setActiveWorkspaceAgent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredMessages = agentContext
    ? messages.filter(
        (m) => m.role === "user" || m.role === "system" || m.agentId === agentContext,
      )
    : messages;

  const hasMessages = filteredMessages.length > 0;
  const isStreaming = messages.some((m) => m.isStreaming);

  // No setup yet: show onboarding
  if (!setupComplete && !hasMessages) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <SetupFlow />
      </div>
    );
  }

  // Setup done, no messages: show one-click workflows
  if (!hasMessages) {
    return (
      <div data-tour="workspace-chat" className="flex-1 flex flex-col overflow-hidden">
        <WorkflowDashboard agentContext={agentContext} />
        <div data-tour="chat-input">
          <ChatInput agentContext={agentContext} />
        </div>
      </div>
    );
  }

  // Active conversation
  return (
    <div data-tour="workspace-chat" className="flex-1 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        <div className="max-w-2xl mx-auto">
          {filteredMessages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 px-4 py-3 text-text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs font-mono">
                {messages.find((m) => m.isStreaming)?.text || "thinking..."}
              </span>
            </div>
          )}
          {!isStreaming && <ContinueButton agentContext={agentContext} />}
        </div>
      </div>
      <div data-tour="chat-input">
        <ChatInput agentContext={agentContext} />
      </div>
    </div>
  );
}
