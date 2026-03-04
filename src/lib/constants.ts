import {
  Compass,
  Scale,
  Handshake,
  Receipt,
  LayoutDashboard,
  Globe,
  Send,
  Landmark,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { ChatMessage, AgentStatus, ArtifactData } from "./store";

/* ── Nav Links ── */
export const navLinks = [
  { label: "Agents", href: "#agents" },
  { label: "Workflow", href: "#workflow" },
  { label: "Data Sources", href: "#data-sources" },
];

/* ── Stats ── */
export const stats = [
  { value: "25,000+", label: "Entities screened across 13 federal lists" },
  { value: "190+", label: "Countries with UN Comtrade trade data" },
  { value: "17,000+", label: "HS codes in our tariff database" },
  { value: "<30s", label: "Full compliance screening per entity" },
];

/* ── Data Sources ── */
export const dataSources = [
  { name: "US Consolidated Screening List", description: "25,000+ entities across 13 federal lists, updated daily", category: "Compliance" },
  { name: "OFAC SDN List", description: "Specially Designated Nationals — US Treasury sanctions", category: "Compliance" },
  { name: "BIS Entity List", description: "Bureau of Industry & Security restricted parties", category: "Compliance" },
  { name: "BIS Denied Persons", description: "Denied export privileges — Commerce Department", category: "Compliance" },
  { name: "ITAR Debarred", description: "State Department debarred arms traffickers", category: "Compliance" },
  { name: "UN Comtrade", description: "Global trade flow data across 190+ countries", category: "Market Data" },
  { name: "USITC HTS", description: "Harmonized Tariff Schedule with duty rates", category: "Classification" },
];

/* ── Agent Definitions ── */
export type AgentId = "market" | "compliance" | "outreach" | "finance";

export interface AgentDef {
  id: AgentId;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
}

export const agents: AgentDef[] = [
  {
    id: "market",
    name: "Market Intelligence",
    title: "Find Your Buyers",
    description:
      "Scans global trade data, identifies high-potential markets, and surfaces qualified buyers matched to your product specifications.",
    icon: Compass,
    capabilities: ["HS Code Mapping", "Market Sizing", "Buyer Matching", "Trend Analysis"],
  },
  {
    id: "compliance",
    name: "Trade Compliance",
    title: "Navigate Regulations",
    description:
      "Monitors tariff schedules, sanctions lists, and FTA eligibility in real-time. Auto-generates export documentation.",
    icon: Scale,
    capabilities: ["Tariff Lookup", "Sanctions Screening", "FTA Analysis", "Document Gen"],
  },
  {
    id: "outreach",
    name: "Buyer Outreach",
    title: "Close the Deal",
    description:
      "Drafts culturally-adapted outreach, manages follow-ups, and handles multilingual communication with prospective buyers.",
    icon: Handshake,
    capabilities: ["Email Drafting", "Follow-up Chains", "Translation", "CRM Sync"],
  },
  {
    id: "finance",
    name: "Export Finance",
    title: "Get Paid Safely",
    description:
      "Structures payment terms, finds export financing, assesses buyer credit risk, and manages currency exposure.",
    icon: Receipt,
    capabilities: ["LC Structuring", "Credit Scoring", "FX Hedging", "Grant Matching"],
  },
];

/* ── Agent Color Map ── */
export const agentColorMap: Record<AgentId, { bg: string; text: string; border: string; dot: string }> = {
  market: {
    bg: "bg-agent-market-muted",
    text: "text-agent-market",
    border: "border-agent-market/30",
    dot: "bg-agent-market",
  },
  compliance: {
    bg: "bg-agent-compliance-muted",
    text: "text-agent-compliance",
    border: "border-agent-compliance/30",
    dot: "bg-agent-compliance",
  },
  outreach: {
    bg: "bg-agent-outreach-muted",
    text: "text-agent-outreach",
    border: "border-agent-outreach/30",
    dot: "bg-agent-outreach",
  },
  finance: {
    bg: "bg-agent-finance-muted",
    text: "text-agent-finance",
    border: "border-agent-finance/30",
    dot: "bg-agent-finance",
  },
};

/* ── Sidebar Links ── */
export interface SidebarLink {
  label: string;
  href: string;
  icon: LucideIcon;
  agentId?: AgentId;
}

export const sidebarLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market Research", href: "/dashboard/market-research", icon: Compass, agentId: "market" },
  { label: "Compliance", href: "/dashboard/compliance", icon: Scale, agentId: "compliance" },
  { label: "Outreach", href: "/dashboard/outreach", icon: Handshake, agentId: "outreach" },
  { label: "Finance", href: "/dashboard/finance", icon: Receipt, agentId: "finance" },
  { label: "Integrations", href: "/dashboard/settings", icon: Settings },
];

/* ── Workflow Steps ── */
export const workflowSteps = [
  {
    step: 1,
    title: "Connect Your Product Catalog",
    description: "Upload your product data or connect your ERP. Our AI maps your SKUs to HS codes and identifies export-ready products.",
  },
  {
    step: 2,
    title: "AI Scans Global Markets",
    description: "The Market Intelligence agent analyzes trade flows, tariff rates, and buyer demand across 190+ countries.",
  },
  {
    step: 3,
    title: "Compliance Auto-Check",
    description: "Every opportunity is screened against sanctions, export controls, and trade agreements before you see it.",
  },
  {
    step: 4,
    title: "Outreach & Negotiation",
    description: "AI-drafted, culturally-adapted outreach lands in buyer inboxes. Follow-ups are automated until engagement.",
  },
  {
    step: 5,
    title: "Secure Payment & Ship",
    description: "The Finance agent structures payment terms, arranges trade finance, and manages FX risk so you get paid safely.",
  },
];

/* ── Comparison Data ── */
export const comparisonData = {
  categories: [
    "Trade Compliance Specialist",
    "Market Research Analyst",
    "International Sales Rep",
    "Export Finance Manager",
    "Total Annual Cost",
    "Time to First Export",
  ],
  traditional: ["$85K/yr", "$75K/yr", "$95K/yr", "$90K/yr", "$345K+/yr", "6-12 months"],
  propeller: [
    "Included",
    "Included",
    "Included",
    "Included",
    "From $499/mo",
    "Under 30 days",
  ],
};

/* ── Mock Artifacts ── */
export const mockArtifacts: Record<string, ArtifactData> = {
  buyerTable: {
    type: "table",
    title: "German Buyer Matches — HS 8481.80",
    content: `| # | Company | City | Revenue | Match Score | Status |
|---|---------|------|---------|-------------|--------|
| 1 | Bosch Rexroth AG | Lohr am Main | €6.2B | 94% | Qualified |
| 2 | HYDAC International | Sulzbach | €680M | 91% | Qualified |
| 3 | Bürkert Fluid Control | Ingelfingen | €520M | 89% | Qualified |
| 4 | Festo SE & Co. KG | Esslingen | €3.8B | 87% | Qualified |
| 5 | Samson AG | Frankfurt | €450M | 85% | Qualified |
| 6 | KSB SE & Co. KGaA | Frankenthal | €2.4B | 83% | Qualified |
| 7 | Gemü Valves | Ingelfingen | €380M | 82% | Qualified |
| 8 | Siemens Process Inst. | Karlsruhe | €18.9B | 80% | Qualified |`,
  },
  complianceReport: {
    type: "report",
    title: "Compliance Screening Report",
    content: `## Entity Screening Summary

**Total Entities Screened:** 23
**Cleared:** 22
**Flagged:** 1

---

### Flagged Entity

**Company:** KSB SE & Co. KGaA — Frankenthal, DE
**Reason:** Partial name match on BIS Entity List (KSB Pumps subsidiary in RU)
**Risk Level:** Medium
**Recommendation:** Exclude from initial outreach pending manual review

---

### Screening Lists Checked (13 Federal Lists)
- OFAC SDN List — ✓ Clear
- BIS Entity List — ⚠ 1 partial match
- BIS Denied Persons List — ✓ Clear
- BIS Unverified List — ✓ Clear
- BIS Military End User — ✓ Clear
- ITAR Debarred (State Dept) — ✓ Clear
- Nonproliferation Sanctions — ✓ Clear
- OFAC Sectoral Sanctions — ✓ Clear
- OFAC Foreign Sanctions Evaders — ✓ Clear

### Export Control Classification
- ECCN: EAR99 (No license required for DE)
- HS Code: 8481.80.50 (Industrial valves, NES)
- FTA: None applicable (US-DE bilateral)`,
  },
  outreachDraft: {
    type: "document",
    title: "Outreach Email Draft — Bosch Rexroth",
    content: `**To:** procurement@boschrexroth.de
**Subject:** High-Performance Industrial Valves — US Manufacturing Partner

---

Sehr geehrte Damen und Herren,

I'm reaching out from [Your Company], a US-based manufacturer specializing in precision industrial valves (HS 8481.80). Our product line includes high-pressure control valves rated to 6,000 PSI with API 6D certification.

Based on your published specifications for hydraulic control systems, we believe our Series 400 valve platform could be an excellent fit for your Lohr am Main production facility.

**Key specifications:**
- Operating pressure: up to 6,000 PSI
- Temperature range: -40°C to 260°C
- Certifications: API 6D, CE, ATEX Zone 1
- Lead time: 4-6 weeks from order

Would you be available for a brief technical discussion next week? We can provide samples and technical datasheets for your engineering review.

Best regards,
[Your Name]`,
  },
  financeTerms: {
    type: "document",
    title: "Recommended Payment Terms",
    content: `## Export Finance Recommendation

### New Buyer Terms (Bosch Rexroth, HYDAC)
- **Instrument:** Irrevocable Letter of Credit at sight
- **Issuing Bank:** Deutsche Bank AG (AA- rated)
- **Coverage:** 100% of invoice value
- **Estimated LC fee:** 0.8-1.2% of value

### Established Buyer Terms (after 3+ orders)
- **Instrument:** Open account, Net 60
- **Credit insurance:** Euler Hermes, 90% coverage
- **Premium:** ~0.4% of invoice value

### FX Hedging
- **Pair:** USD/EUR
- **Recommendation:** 90-day forward contract
- **Current spot:** 1.0842
- **Forward rate:** 1.0861 (19 pip premium)
- **Hedge ratio:** 75% of expected receivables

### Export Financing Available
- **SBA STEP Grant:** Up to $15K for trade show attendance
- **Ex-Im Bank Working Capital:** 90% advance rate on export orders`,
  },
};

/* ── Mock Conversation ── */
export const mockConversation: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    text: "Find German buyers for our industrial valves — HS 8481.80. We need at least 20 qualified prospects.",
    timestamp: new Date("2026-03-04T09:00:00"),
  },
  {
    id: "msg-2",
    role: "agent",
    agentId: "market",
    text: "Scanning global trade data for HS 8481.80 (industrial valves, taps, cocks). Focusing on Germany — the #2 global importer of this category at $3.8B/yr.",
    timestamp: new Date("2026-03-04T09:00:05"),
  },
  {
    id: "msg-3",
    role: "system",
    text: "Market Intelligence agent is analyzing trade flows across 847 importers...",
    timestamp: new Date("2026-03-04T09:00:08"),
  },
  {
    id: "msg-4",
    role: "agent",
    agentId: "market",
    text: "Found 23 high-match German buyers for HS 8481.80. Top prospects include Bosch Rexroth (94% match), HYDAC International (91%), and Bürkert (89%). Here's the full buyer table:",
    timestamp: new Date("2026-03-04T09:01:30"),
    artifact: mockArtifacts.buyerTable,
  },
  {
    id: "msg-5",
    role: "agent",
    agentId: "compliance",
    text: "Automatically screening all 23 entities against OFAC, BIS, EU, and UN sanctions lists...",
    timestamp: new Date("2026-03-04T09:01:35"),
  },
  {
    id: "msg-6",
    role: "agent",
    agentId: "compliance",
    text: "Screening complete. 22 entities cleared. 1 entity flagged — KSB SE & Co. KGaA has a partial name match on the BIS Entity List due to a Russian subsidiary. Full report:",
    timestamp: new Date("2026-03-04T09:02:45"),
    artifact: mockArtifacts.complianceReport,
  },
  {
    id: "msg-7",
    role: "agent",
    agentId: "compliance",
    text: "I recommend excluding KSB from the initial outreach pending manual review. Should I proceed?",
    timestamp: new Date("2026-03-04T09:02:50"),
    actionCard: {
      type: "approval",
      title: "Exclude KSB SE & Co. KGaA from outreach",
      status: "pending",
      metadata: {
        entity: "KSB SE & Co. KGaA",
        reason: "BIS Entity List partial match",
        risk: "Medium",
      },
    },
  },
  {
    id: "msg-8",
    role: "user",
    text: "Yes, exclude KSB for now. Go ahead with outreach to the other 22.",
    timestamp: new Date("2026-03-04T09:03:30"),
  },
  {
    id: "msg-9",
    role: "agent",
    agentId: "outreach",
    text: "Drafting personalized outreach emails for the top 8 buyers. Using English with German greeting conventions. Here's the draft for Bosch Rexroth:",
    timestamp: new Date("2026-03-04T09:04:00"),
    artifact: mockArtifacts.outreachDraft,
  },
  {
    id: "msg-10",
    role: "system",
    text: "Outreach agent is generating 22 personalized emails (8 complete, 14 in progress)...",
    timestamp: new Date("2026-03-04T09:04:30"),
  },
  {
    id: "msg-11",
    role: "agent",
    agentId: "finance",
    text: "While outreach is being prepared, I've analyzed the recommended payment structures for German buyers. For new relationships, I recommend irrevocable LCs at sight through Deutsche Bank. Here are the full terms:",
    timestamp: new Date("2026-03-04T09:05:00"),
    artifact: mockArtifacts.financeTerms,
  },
  {
    id: "msg-12",
    role: "agent",
    agentId: "finance",
    text: "I also found an SBA STEP Grant opportunity — up to $15K to cover trade show costs at Hannover Messe. Want me to start the application?",
    timestamp: new Date("2026-03-04T09:05:15"),
    actionCard: {
      type: "approval",
      title: "Start SBA STEP Grant application",
      status: "pending",
      metadata: {
        program: "SBA STEP Grant",
        amount: "Up to $15,000",
        deadline: "April 15, 2026",
      },
    },
  },
];

/* ── Mock Agent Statuses ── */
export const mockAgentStatuses: AgentStatus[] = [
  {
    agentId: "market",
    status: "complete",
    currentTask: "Found 23 German buyers",
    progress: 100,
  },
  {
    agentId: "compliance",
    status: "working",
    currentTask: "Deep screening flagged entities",
    progress: 78,
  },
  {
    agentId: "outreach",
    status: "working",
    currentTask: "Drafting personalized emails",
    progress: 34,
  },
  {
    agentId: "finance",
    status: "idle",
    currentTask: "Payment terms ready",
    progress: 0,
  },
];

/* ── Quick Actions ── */
export interface QuickAction {
  label: string;
  prompt: string;
  agentId: AgentId;
  icon: LucideIcon;
}

export const quickActions: QuickAction[] = [
  {
    label: "Find buyers",
    prompt: "Find qualified buyers for our products in ",
    agentId: "market",
    icon: Globe,
  },
  {
    label: "Check compliance",
    prompt: "Screen these entities for sanctions and export controls: ",
    agentId: "compliance",
    icon: Scale,
  },
  {
    label: "Draft outreach",
    prompt: "Draft outreach emails for our top buyer prospects",
    agentId: "outreach",
    icon: Send,
  },
  {
    label: "Structure payment",
    prompt: "Recommend payment terms and export financing for ",
    agentId: "finance",
    icon: Landmark,
  },
];
