/**
 * Onboarding constants — product categories, tour steps, and getting-started tasks.
 */

/* ── Product Categories by Sector ── */

export interface ProductCategory {
  label: string;
  value: string;
}

export interface ProductSector {
  name: string;
  categories: ProductCategory[];
}

export const productSectors: ProductSector[] = [
  {
    name: "Metals & Materials",
    categories: [
      { label: "Steel & Metal Products", value: "steel-metal-products" },
      { label: "Fabricated Metal Parts", value: "fabricated-metal-parts" },
      { label: "Aluminum & Alloys", value: "aluminum-alloys" },
    ],
  },
  {
    name: "Machinery & Equipment",
    categories: [
      { label: "Industrial Machinery", value: "industrial-machinery" },
      { label: "Pumps, Valves & Compressors", value: "pumps-valves-compressors" },
      { label: "HVAC & Refrigeration", value: "hvac-refrigeration" },
      { label: "Packaging Machinery", value: "packaging-machinery" },
    ],
  },
  {
    name: "Electrical & Electronics",
    categories: [
      { label: "Electronics & Semiconductors", value: "electronics-semiconductors" },
      { label: "Electrical Equipment", value: "electrical-equipment" },
      { label: "Instruments & Controls", value: "instruments-controls" },
    ],
  },
  {
    name: "Transportation",
    categories: [
      { label: "Automotive Parts", value: "automotive-parts" },
      { label: "Aerospace Components", value: "aerospace-components" },
      { label: "Marine & Boat Parts", value: "marine-boat-parts" },
    ],
  },
  {
    name: "Chemicals & Plastics",
    categories: [
      { label: "Industrial Chemicals", value: "industrial-chemicals" },
      { label: "Plastics & Rubber Products", value: "plastics-rubber" },
      { label: "Paints, Coatings & Adhesives", value: "paints-coatings-adhesives" },
    ],
  },
  {
    name: "Consumer & Medical",
    categories: [
      { label: "Medical Devices & Equipment", value: "medical-devices" },
      { label: "Food & Beverage Products", value: "food-beverage" },
      { label: "Furniture & Wood Products", value: "furniture-wood" },
      { label: "Textiles & Apparel", value: "textiles-apparel" },
    ],
  },
  {
    name: "Other Industries",
    categories: [
      { label: "Construction Materials", value: "construction-materials" },
      { label: "Paper & Packaging", value: "paper-packaging" },
      { label: "Energy & Power Equipment", value: "energy-power" },
      { label: "Other", value: "other" },
    ],
  },
];

// Flat list of all categories for convenience
export const allCategories: ProductCategory[] = productSectors.flatMap((s) => s.categories);

/* ── Tour Step Definitions ── */

export interface TourStepDef {
  id: string;
  target: string; // data-tour attribute value
  title: string;
  description: string;
  valueProp: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  lockSidebar?: boolean; // Keep sidebar expanded for this step
}

export const tourSteps: TourStepDef[] = [
  {
    id: "workspace",
    target: "workspace-chat",
    title: "Your Command Center",
    description:
      "This is where you talk to your AI agents. Ask anything about exporting — finding buyers, checking compliance, classifying products.",
    valueProp:
      "One prompt kicks off 4 agents working in parallel — results in minutes, not weeks.",
    position: "center",
  },
  {
    id: "agent-status",
    target: "agent-status-bar",
    title: "Live Agent Status",
    description:
      "See which agents are working in real-time. Each dot shows activity — pulsing means an agent is analyzing data for you.",
    valueProp:
      "Four specialized agents working in parallel means results in minutes, not weeks.",
    position: "bottom",
  },
  {
    id: "sidebar-nav",
    target: "sidebar-nav",
    title: "Specialized Workspaces",
    description:
      "Each agent has its own workspace. Jump to Market Research, Compliance, Outreach, or Finance for focused tasks.",
    valueProp:
      "Talk to a specific agent directly when you need targeted expertise.",
    position: "right",
    lockSidebar: true,
  },
  {
    id: "monitoring",
    target: "sidebar-monitoring",
    title: "Continuous Compliance Monitoring",
    description:
      "Add trade partners to your watchlist. Propeller screens them daily against 13 federal lists — OFAC, BIS, and more.",
    valueProp:
      "Never miss a sanctions list change. Get alerted before it becomes a $300K violation.",
    position: "right",
    lockSidebar: true,
  },
  {
    id: "trade-events",
    target: "sidebar-trade-events",
    title: "Trade Events Calendar",
    description:
      "Browse upcoming trade shows, export missions, and buyer meetings. Filtered to your product category and target markets.",
    valueProp:
      "SBA STEP grants can cover trade show costs — we match you with the right events.",
    position: "right",
    lockSidebar: true,
  },
  {
    id: "integrations",
    target: "sidebar-integrations",
    title: "Connect Your Tools",
    description:
      "Link Google Sheets to auto-screen your customer list. Connect Slack for real-time compliance alerts.",
    valueProp:
      "Your existing spreadsheet becomes a live compliance dashboard with one click.",
    position: "right",
    lockSidebar: true,
  },
  {
    id: "chat-input",
    target: "chat-input",
    title: "Ask Anything",
    description:
      "Type a question or pick a workflow. Use @ to tag a specific agent. Your agents understand trade data, regulations, and buyer outreach.",
    valueProp:
      'Try: "Find buyers for my products in Germany" or "What HS code fits industrial valves?"',
    position: "top",
  },
];

/* ── Onboarding Hub Task Definitions ── */

export interface OnboardingTaskDef {
  id: string;
  label: string;
  subtitle: string;
  href?: string; // Where to navigate when clicked
  storageKey?: string; // localStorage key to check for completion
}

export const onboardingTasks: OnboardingTaskDef[] = [
  {
    id: "profile",
    label: "Complete your profile",
    subtitle: "Tell us about your company and products",
    href: "/dashboard",
  },
  {
    id: "first-analysis",
    label: "Run your first analysis",
    subtitle: "Ask the agents to research a market",
    href: "/dashboard",
    storageKey: "propeller_first_analysis",
  },
  {
    id: "watchlist",
    label: "Add to watchlist",
    subtitle: "Monitor a trade partner for compliance",
    href: "/dashboard/monitoring",
  },
  {
    id: "trade-events",
    label: "Browse trade events",
    subtitle: "Find upcoming shows for your industry",
    href: "/dashboard/trade-events",
    storageKey: "propeller_visited_trade_events",
  },
  {
    id: "integration",
    label: "Connect an integration",
    subtitle: "Link Sheets or Slack to your workspace",
    href: "/dashboard/settings",
    storageKey: "propeller_connected_integration",
  },
];
