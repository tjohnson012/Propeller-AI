"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/ui/FadeUp";
import {
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  SlackLogo,
  GmailLogo,
  GoogleSheetsLogo,
  QuickBooksLogo,
} from "@/components/icons/IntegrationLogos";

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  color: string;
  bg: string;
  logo: React.ComponentType<{ className?: string }>;
  capabilities: Array<{ label: string; detail: string }>;
  envVars: string[];
  docsUrl: string;
}

const integrations: IntegrationDef[] = [
  {
    id: "slack",
    name: "Slack",
    description:
      "Screen entities, classify products, and search trade flows from any Slack channel.",
    color: "text-agent-market",
    bg: "bg-agent-market-muted",
    logo: SlackLogo,
    capabilities: [
      { label: "/propeller screen [company]", detail: "OFAC sanctions screening" },
      { label: "/propeller classify [product]", detail: "HS code classification" },
      { label: "/propeller flows [hs-code]", detail: "Trade flow analysis" },
    ],
    envVars: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    docsUrl: "https://api.slack.com/apps",
  },
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Forward buyer emails for auto-analysis, OFAC screening, and AI-drafted replies.",
    color: "text-red-400",
    bg: "bg-red-400/8",
    logo: GmailLogo,
    capabilities: [
      { label: "Forward to analyze", detail: "Extract entities, products, and terms" },
      { label: "Auto-draft replies", detail: "AI-generated professional responses" },
      { label: "Inline screening", detail: "Auto-screen companies against CSL" },
    ],
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    docsUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    id: "sheets",
    name: "Google Sheets",
    description:
      "Import product catalogs, export buyer lists, and run bulk screening from spreadsheets.",
    color: "text-agent-outreach",
    bg: "bg-agent-outreach-muted",
    logo: GoogleSheetsLogo,
    capabilities: [
      { label: "=PROPELLER_CLASSIFY(A2)", detail: "Classify products in bulk" },
      { label: "=PROPELLER_SCREEN(A2)", detail: "Screen entities from a column" },
      { label: "Export to Sheets", detail: "Push buyer lists and reports" },
    ],
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    docsUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description:
      "Sync inventory for HS classification, screen customers, and generate export invoices.",
    color: "text-agent-finance",
    bg: "bg-agent-finance-muted",
    logo: QuickBooksLogo,
    capabilities: [
      { label: "Sync Inventory", detail: "Pull items and auto-classify HS codes" },
      { label: "Screen Customers", detail: "Run CSL screening on customers" },
      { label: "Export Invoice", detail: "Add export fields to invoices" },
    ],
    envVars: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"],
    docsUrl: "https://developer.intuit.com/app/developer/dashboard",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-text-muted hover:text-text-secondary transition-colors"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-agent-outreach" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

type OAuthStatus = {
  configured: boolean;
  connected: boolean;
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [oauthStatuses, setOauthStatuses] = useState<Record<string, OAuthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Check for OAuth callback status in URL
  const callbackIntegration = searchParams.get("integration");
  const callbackStatus = searchParams.get("status");

  // Fetch OAuth configuration status on mount
  useEffect(() => {
    fetch("/api/integrations/oauth/config")
      .then((r) => r.json())
      .then((data) => {
        const statuses: Record<string, OAuthStatus> = {};
        for (const item of data.integrations) {
          statuses[item.id] = {
            configured: item.configured,
            connected: item.connected,
          };
        }
        setOauthStatuses(statuses);
      })
      .catch(() => {
        // Default to unconfigured
      })
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = (integrationId: string) => {
    setConnectingId(integrationId);
    // Redirect to OAuth authorize endpoint
    window.location.href = `/api/integrations/oauth/authorize?platform=${integrationId}`;
  };

  return (
    <div className="flex-1 overflow-y-auto py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-2xl text-text-primary mb-1">
          Integrations
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Connect Propeller to the tools you already use.
        </p>

        {/* OAuth callback notification */}
        {callbackIntegration && callbackStatus && (
          <div
            className={cn(
              "mb-6 px-4 py-3 rounded-lg border text-sm flex items-center gap-2",
              callbackStatus === "success"
                ? "bg-agent-outreach-muted border-agent-outreach/30 text-agent-outreach"
                : "bg-red-400/10 border-red-400/30 text-red-400",
            )}
          >
            {callbackStatus === "success" ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {integrations.find((i) => i.id === callbackIntegration)?.name} connected
                successfully.
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Failed to connect{" "}
                {integrations.find((i) => i.id === callbackIntegration)?.name}.{" "}
                {searchParams.get("message") || "Please try again."}
              </>
            )}
          </div>
        )}

        <div className="space-y-4">
          {integrations.map((integration, i) => {
            const Logo = integration.logo;
            const status = oauthStatuses[integration.id];
            const isConfigured = status?.configured ?? false;
            const isConnected =
              status?.connected ||
              (callbackIntegration === integration.id &&
                callbackStatus === "success");
            const isExpanded = expandedId === integration.id;
            const isConnecting = connectingId === integration.id;

            return (
              <FadeUp key={integration.id} delay={i * 0.05}>
                <div className="rounded-xl border border-border-primary bg-bg-secondary overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-4 p-5">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        integration.bg,
                      )}
                    >
                      <Logo className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-medium text-text-primary">
                          {integration.name}
                        </h3>
                        {isConnected && (
                          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-agent-outreach-muted text-agent-outreach">
                            <CheckCircle className="w-3 h-3" />
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {integration.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Connect / Configure button */}
                      {loading ? (
                        <div className="w-20 h-8 bg-bg-tertiary rounded-lg animate-pulse" />
                      ) : isConnected ? (
                        <span className="text-xs text-agent-outreach font-medium px-3 py-1.5">
                          Active
                        </span>
                      ) : isConfigured ? (
                        <button
                          onClick={() => handleConnect(integration.id)}
                          disabled={isConnecting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {isConnecting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5" />
                          )}
                          Connect
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : integration.id,
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Set up
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setExpandedId(
                            isExpanded ? null : integration.id,
                          )
                        }
                        className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border-primary p-5 animation-slide-up">
                      {/* Credentials setup (when not configured) */}
                      {!isConfigured && (
                        <div className="mb-6 p-4 rounded-lg bg-bg-primary border border-border-primary">
                          <p className="text-sm font-medium text-text-primary mb-2">
                            Credentials required
                          </p>
                          <p className="text-xs text-text-secondary mb-3">
                            Add these environment variables to{" "}
                            <code className="text-accent">.env.local</code> to
                            enable this integration:
                          </p>
                          <div className="space-y-1.5">
                            {integration.envVars.map((varName) => (
                              <div
                                key={varName}
                                className="flex items-center justify-between px-3 py-1.5 rounded bg-bg-secondary"
                              >
                                <code className="text-xs font-mono text-accent">
                                  {varName}=your_value_here
                                </code>
                                <CopyButton text={`${varName}=`} />
                              </div>
                            ))}
                          </div>
                          <a
                            href={integration.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 text-xs text-accent hover:underline"
                          >
                            Get credentials
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {/* Capabilities */}
                      <p className="text-xs text-text-muted font-mono uppercase tracking-widest mb-3">
                        Capabilities
                      </p>
                      <div className="space-y-2 mb-6">
                        {integration.capabilities.map((cap) => (
                          <div
                            key={cap.label}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-primary"
                          >
                            <div className="flex items-center gap-3">
                              <code className="text-xs font-mono text-accent">
                                {cap.label}
                              </code>
                              <span className="text-xs text-text-tertiary">
                                {cap.detail}
                              </span>
                            </div>
                            <CopyButton text={cap.label} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FadeUp>
            );
          })}
        </div>

        {/* Webhook endpoint info */}
        <div className="mt-8 p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <p className="text-xs text-text-muted font-mono uppercase tracking-widest mb-2">
            Webhook endpoint
          </p>
          <div className="flex items-center justify-between">
            <code className="text-sm text-text-secondary font-mono">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/integrations/`
                : "/api/integrations/"}
            </code>
            <CopyButton
              text={
                typeof window !== "undefined"
                  ? `${window.location.origin}/api/integrations/`
                  : "/api/integrations/"
              }
            />
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Use this base URL when configuring webhooks in your integration
            platform.
          </p>
        </div>
      </div>
    </div>
  );
}
