"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
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
  Unplug,
  RefreshCw,
  Send,
  Hash,
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
      "Get real-time alerts in Slack when monitoring detects screening list changes for your trade partners.",
    color: "text-agent-market",
    bg: "bg-agent-market-muted",
    logo: SlackLogo,
    capabilities: [
      { label: "Screening alerts", detail: "Real-time Slack notifications for watchlist changes" },
      { label: "Severity levels", detail: "Critical, warning, and info alerts" },
      { label: "Direct links", detail: "Jump to Propeller monitoring from alerts" },
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
      "Connect a customer spreadsheet. Propeller screens every entity, writes results back, and monitors them daily.",
    color: "text-agent-outreach",
    bg: "bg-agent-outreach-muted",
    logo: GoogleSheetsLogo,
    capabilities: [
      { label: "Auto-screen", detail: "Screen all entities in your spreadsheet" },
      { label: "Results tab", detail: "Writes screening results back to your sheet" },
      { label: "Daily sync", detail: "New rows auto-screened and added to watchlist" },
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
  metadata?: Record<string, unknown>;
};

interface SlackChannel {
  id: string;
  name: string;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [oauthStatuses, setOauthStatuses] = useState<
    Record<string, OAuthStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Sheets sync state
  const [sheetUrl, setSheetUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    entitiesFound: number;
    screened: number;
    flagged: number;
    clear: number;
    addedToWatchlist: number;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Slack channel state
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [savingChannel, setSavingChannel] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  // Disconnect state
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Check for OAuth callback status in URL
  const callbackIntegration = searchParams.get("integration");
  const callbackStatus = searchParams.get("status");

  // Fetch OAuth configuration status on mount
  const fetchStatuses = useCallback(() => {
    fetch("/api/integrations/oauth/config")
      .then((r) => r.json())
      .then((data) => {
        const statuses: Record<string, OAuthStatus> = {};
        let anyConnected = false;
        for (const item of data.integrations) {
          statuses[item.id] = {
            configured: item.configured,
            connected: item.connected,
            metadata: item.metadata,
          };
          if (item.connected) anyConnected = true;
        }
        if (anyConnected) {
          localStorage.setItem("propeller_connected_integration", "true");
        }
        setOauthStatuses(statuses);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleConnect = (integrationId: string) => {
    setConnectingId(integrationId);
    window.location.href = `/api/integrations/oauth/authorize?platform=${integrationId}`;
  };

  const handleDisconnect = async (
    integrationId: string,
    endpoint: string,
    action: string,
  ) => {
    setDisconnecting(integrationId);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      fetchStatuses();
      setSyncResult(null);
      setSheetUrl("");
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  };

  // Sheets sync handlers
  const handleSheetSync = async (action: "initial_sync" | "incremental_sync") => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const resp = await fetch("/api/integrations/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "initial_sync" ? { sheetUrl } : {}),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSyncError(data.error || "Sync failed");
      } else {
        setSyncResult(data);
        fetchStatuses(); // Refresh metadata
      }
    } catch {
      setSyncError("Network error");
    } finally {
      setSyncing(false);
    }
  };

  // Slack channel handlers
  const handleFetchChannels = async () => {
    setChannelsLoading(true);
    try {
      const resp = await fetch("/api/integrations/slack/channels");
      const data = await resp.json();
      if (data.channels) setChannels(data.channels);
    } catch {
      // ignore
    } finally {
      setChannelsLoading(false);
    }
  };

  const handleSelectChannel = async () => {
    if (!selectedChannel) return;
    const channel = channels.find((c) => c.id === selectedChannel);
    if (!channel) return;

    setSavingChannel(true);
    try {
      await fetch("/api/integrations/slack/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select_channel",
          channelId: channel.id,
          channelName: channel.name,
        }),
      });
      fetchStatuses();
    } catch {
      // ignore
    } finally {
      setSavingChannel(false);
    }
  };

  const handleTestAlert = async () => {
    setTestingAlert(true);
    try {
      await fetch("/api/integrations/slack/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_alert" }),
      });
    } catch {
      // ignore
    } finally {
      setTestingAlert(false);
    }
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
                {
                  integrations.find((i) => i.id === callbackIntegration)
                    ?.name
                }{" "}
                connected successfully.
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Failed to connect{" "}
                {
                  integrations.find((i) => i.id === callbackIntegration)
                    ?.name
                }
                . {searchParams.get("message") || "Please try again."}
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
            const metadata = status?.metadata || {};

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
                      {loading ? (
                        <div className="w-20 h-8 bg-bg-tertiary rounded-lg animate-pulse" />
                      ) : isConnected ? (
                        <button
                          onClick={() =>
                            setExpandedId(
                              isExpanded ? null : integration.id,
                            )
                          }
                          className="text-xs text-agent-outreach font-medium px-3 py-1.5 hover:bg-agent-outreach-muted rounded-lg transition-colors"
                        >
                          Manage
                        </button>
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
                      {/* Connected: Sheets management */}
                      {isConnected && integration.id === "sheets" && (
                        <SheetsPanel
                          metadata={metadata}
                          sheetUrl={sheetUrl}
                          setSheetUrl={setSheetUrl}
                          syncing={syncing}
                          syncResult={syncResult}
                          syncError={syncError}
                          onSync={handleSheetSync}
                          onDisconnect={() =>
                            handleDisconnect(
                              "sheets",
                              "/api/integrations/sheets/sync",
                              "disconnect",
                            )
                          }
                          disconnecting={disconnecting === "sheets"}
                        />
                      )}

                      {/* Connected: Slack management */}
                      {isConnected && integration.id === "slack" && (
                        <SlackPanel
                          metadata={metadata}
                          channels={channels}
                          channelsLoading={channelsLoading}
                          selectedChannel={selectedChannel}
                          setSelectedChannel={setSelectedChannel}
                          savingChannel={savingChannel}
                          testingAlert={testingAlert}
                          onFetchChannels={handleFetchChannels}
                          onSelectChannel={handleSelectChannel}
                          onTestAlert={handleTestAlert}
                          onDisconnect={() =>
                            handleDisconnect(
                              "slack",
                              "/api/integrations/slack/channels",
                              "disconnect",
                            )
                          }
                          disconnecting={disconnecting === "slack"}
                        />
                      )}

                      {/* Credentials setup (when not configured) */}
                      {!isConfigured && (
                        <div className="mb-6 p-4 rounded-lg bg-bg-primary border border-border-primary">
                          <p className="text-sm font-medium text-text-primary mb-2">
                            Credentials required
                          </p>
                          <p className="text-xs text-text-secondary mb-3">
                            Add these environment variables to{" "}
                            <code className="text-accent">.env.local</code>{" "}
                            to enable this integration:
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

/* ── Sheets management panel ── */

function SheetsPanel({
  metadata,
  sheetUrl,
  setSheetUrl,
  syncing,
  syncResult,
  syncError,
  onSync,
  onDisconnect,
  disconnecting,
}: {
  metadata: Record<string, unknown>;
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  syncing: boolean;
  syncResult: {
    entitiesFound: number;
    screened: number;
    flagged: number;
    clear: number;
    addedToWatchlist: number;
  } | null;
  syncError: string | null;
  onSync: (action: "initial_sync" | "incremental_sync") => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const hasSheet = !!(metadata.sheet_url as string);

  return (
    <div className="mb-6 space-y-4">
      {hasSheet ? (
        <>
          {/* Connected + synced state */}
          <div className="p-4 rounded-lg bg-bg-primary border border-border-primary space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                Connected Sheet
              </span>
              <span className="text-xs text-text-tertiary">
                Last sync:{" "}
                {metadata.last_sync_at
                  ? new Date(
                      metadata.last_sync_at as string,
                    ).toLocaleDateString()
                  : "never"}
              </span>
            </div>
            <a
              href={metadata.sheet_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline truncate block"
            >
              {metadata.sheet_url as string}
            </a>
            <p className="text-xs text-text-secondary">
              {(metadata.entity_count as number) || 0} entities tracked
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSync("incremental_sync")}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Re-sync Now
            </button>
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Connected but no sheet URL yet */}
          <div className="p-4 rounded-lg bg-bg-primary border border-border-primary space-y-3">
            <p className="text-sm text-text-primary font-medium">
              Paste your Google Sheet URL
            </p>
            <p className="text-xs text-text-secondary">
              Propeller will read your spreadsheet, screen every entity, write
              results back, and add them to your monitoring watchlist.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => onSync("initial_sync")}
                disabled={syncing || !sheetUrl.includes("spreadsheets/d/")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Start Sync
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="p-3 rounded-lg bg-agent-outreach-muted border border-agent-outreach/30 text-sm space-y-1">
          <p className="font-medium text-agent-outreach">Sync complete</p>
          <div className="text-xs text-text-secondary space-y-0.5">
            <p>
              {syncResult.entitiesFound} entities found,{" "}
              {syncResult.screened} screened
            </p>
            <p>
              {syncResult.clear} clear, {syncResult.flagged} flagged
            </p>
            <p>{syncResult.addedToWatchlist} added to monitoring watchlist</p>
          </div>
        </div>
      )}

      {syncError && (
        <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/30 text-sm">
          <p className="text-red-400">{syncError}</p>
        </div>
      )}
    </div>
  );
}

/* ── Slack management panel ── */

function SlackPanel({
  metadata,
  channels,
  channelsLoading,
  selectedChannel,
  setSelectedChannel,
  savingChannel,
  testingAlert,
  onFetchChannels,
  onSelectChannel,
  onTestAlert,
  onDisconnect,
  disconnecting,
}: {
  metadata: Record<string, unknown>;
  channels: SlackChannel[];
  channelsLoading: boolean;
  selectedChannel: string;
  setSelectedChannel: (id: string) => void;
  savingChannel: boolean;
  testingAlert: boolean;
  onFetchChannels: () => void;
  onSelectChannel: () => void;
  onTestAlert: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const hasChannel = !!(metadata.channel_id as string);
  const channelName = (metadata.channel_name as string) || "";
  const teamName = (metadata.team_name as string) || "";

  return (
    <div className="mb-6 space-y-4">
      {hasChannel ? (
        <>
          {/* Connected + channel selected */}
          <div className="p-4 rounded-lg bg-bg-primary border border-border-primary space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                Alert Channel
              </span>
              {teamName && (
                <span className="text-xs text-text-tertiary">
                  {teamName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-primary font-medium">
                {channelName}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onTestAlert}
              disabled={testingAlert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {testingAlert ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Test Alert
            </button>
            <button
              onClick={() => {
                onFetchChannels();
              }}
              disabled={channelsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Change Channel
            </button>
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Connected but no channel selected */}
          <div className="p-4 rounded-lg bg-bg-primary border border-border-primary space-y-3">
            <p className="text-sm text-text-primary font-medium">
              Select a channel for alerts
            </p>
            <p className="text-xs text-text-secondary">
              Choose which Slack channel should receive screening alerts.
            </p>

            {channels.length === 0 ? (
              <button
                onClick={onFetchChannels}
                disabled={channelsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {channelsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Hash className="w-3.5 h-3.5" />
                )}
                Load Channels
              </button>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-primary text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onSelectChannel}
                  disabled={savingChannel || !selectedChannel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {savingChannel ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Select
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </>
      )}

      {/* Channel picker (shown when "Change Channel" is clicked while already connected) */}
      {hasChannel && channels.length > 0 && (
        <div className="p-4 rounded-lg bg-bg-primary border border-border-primary space-y-3">
          <p className="text-sm text-text-primary font-medium">
            Change alert channel
          </p>
          <div className="flex gap-2">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-primary text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Select a channel...</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name}
                </option>
              ))}
            </select>
            <button
              onClick={onSelectChannel}
              disabled={savingChannel || !selectedChannel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {savingChannel ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
