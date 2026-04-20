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
      { label: "Copper, Brass & Bronze", value: "copper-brass-bronze" },
      { label: "Specialty Alloys & Titanium", value: "specialty-alloys-titanium" },
      { label: "Castings & Forgings", value: "castings-forgings" },
      { label: "Wire, Cable & Fasteners", value: "wire-cable-fasteners" },
    ],
  },
  {
    name: "Industrial Machinery",
    categories: [
      { label: "Industrial Machinery — General", value: "industrial-machinery" },
      { label: "Pumps, Valves & Compressors", value: "pumps-valves-compressors" },
      { label: "HVAC & Refrigeration", value: "hvac-refrigeration" },
      { label: "Packaging Machinery", value: "packaging-machinery" },
      { label: "Machine Tools (CNC, Milling, Lathes)", value: "machine-tools" },
      { label: "Material Handling (Cranes, Conveyors)", value: "material-handling" },
      { label: "Printing & Textile Machinery", value: "printing-textile-machinery" },
      { label: "Oil, Gas & Drilling Equipment", value: "oil-gas-drilling" },
      { label: "Mining & Extraction Equipment", value: "mining-extraction" },
      { label: "Construction Equipment", value: "construction-equipment" },
    ],
  },
  {
    name: "Agriculture, Food & Beverage",
    categories: [
      { label: "Agricultural Machinery (Tractors, Harvesters)", value: "agricultural-machinery" },
      { label: "Food Processing Equipment", value: "food-processing-equipment" },
      { label: "Packaged Food Products", value: "food-products" },
      { label: "Beverages (Alcoholic & Non-Alcoholic)", value: "beverages" },
      { label: "Fertilizers, Seeds & Agricultural Inputs", value: "agricultural-inputs" },
      { label: "Animal Feed & Pet Food", value: "animal-feed" },
    ],
  },
  {
    name: "Electrical & Electronics",
    categories: [
      { label: "Electronics & Semiconductors", value: "electronics-semiconductors" },
      { label: "Electrical Equipment (Motors, Generators)", value: "electrical-equipment" },
      { label: "Scientific & Laboratory Instruments", value: "scientific-instruments" },
      { label: "Industrial Controls & PLCs", value: "industrial-controls" },
      { label: "Sensors & Metrology", value: "sensors-metrology" },
      { label: "Batteries & Energy Storage", value: "batteries-energy-storage" },
      { label: "Lighting & LED Products", value: "lighting-led" },
      { label: "Printed Circuit Boards & Assemblies", value: "pcb-assemblies" },
    ],
  },
  {
    name: "Communications & IT",
    categories: [
      { label: "Telecommunications Equipment", value: "telecom-equipment" },
      { label: "Networking Hardware (Routers, Switches)", value: "networking-hardware" },
      { label: "Data Center & Server Equipment", value: "data-center-equipment" },
      { label: "Broadcast & Audio/Visual Equipment", value: "broadcast-av" },
      { label: "Software Products (Physical/OEM)", value: "software-products" },
    ],
  },
  {
    name: "Transportation",
    categories: [
      { label: "Automotive Parts & Components", value: "automotive-parts" },
      { label: "Aerospace — Commercial Components", value: "aerospace-commercial" },
      { label: "Aerospace — Defense / ITAR", value: "aerospace-defense" },
      { label: "Marine & Boat Parts", value: "marine-boat-parts" },
      { label: "Rail Equipment & Components", value: "rail-equipment" },
      { label: "Electric Vehicle Components", value: "ev-components" },
      { label: "Commercial Truck & Trailer Parts", value: "truck-trailer-parts" },
    ],
  },
  {
    name: "Clean Tech, Energy & Water",
    categories: [
      { label: "Solar — Panels, Inverters & BOS", value: "solar-equipment" },
      { label: "Wind Turbine Components", value: "wind-components" },
      { label: "Power Generation & Transmission", value: "power-generation" },
      { label: "Hydrogen & Fuel Cell Equipment", value: "hydrogen-fuel-cell" },
      { label: "Water Treatment & Filtration", value: "water-treatment" },
      { label: "Environmental & Pollution Control", value: "environmental-control" },
      { label: "Energy Efficiency Products", value: "energy-efficiency" },
    ],
  },
  {
    name: "Robotics & Automation",
    categories: [
      { label: "Industrial Robots & Cobots", value: "industrial-robots" },
      { label: "Automation Components (Drives, Actuators)", value: "automation-components" },
      { label: "Vision Systems & Machine Vision", value: "vision-systems" },
      { label: "Additive Manufacturing (3D Printing)", value: "additive-manufacturing" },
    ],
  },
  {
    name: "Defense, Security & Aerospace",
    categories: [
      { label: "Firearms, Ammunition & Components (ITAR)", value: "firearms-itar" },
      { label: "Military Vehicles & Components (ITAR)", value: "military-vehicles-itar" },
      { label: "Security & Surveillance Equipment", value: "security-surveillance" },
      { label: "Body Armor & Protective Gear", value: "body-armor" },
      { label: "Satellite & Space Components", value: "satellite-space" },
      { label: "Unmanned Aerial Systems (UAS/Drones)", value: "uas-drones" },
    ],
  },
  {
    name: "Chemicals & Plastics",
    categories: [
      { label: "Industrial Chemicals", value: "industrial-chemicals" },
      { label: "Specialty & Fine Chemicals", value: "specialty-chemicals" },
      { label: "Plastics & Rubber Products", value: "plastics-rubber" },
      { label: "Paints, Coatings & Adhesives", value: "paints-coatings-adhesives" },
      { label: "Resins & Polymers", value: "resins-polymers" },
      { label: "Composites (Fiberglass, Carbon Fiber)", value: "composites" },
    ],
  },
  {
    name: "Medical & Pharmaceutical",
    categories: [
      { label: "Medical Devices & Equipment", value: "medical-devices" },
      { label: "Diagnostic & Imaging Equipment", value: "diagnostic-imaging" },
      { label: "Surgical Instruments", value: "surgical-instruments" },
      { label: "Dental Equipment & Supplies", value: "dental-equipment" },
      { label: "Pharmaceuticals & Active Ingredients", value: "pharmaceuticals" },
      { label: "Veterinary Medicine & Equipment", value: "veterinary" },
      { label: "PPE & Disposables", value: "ppe-disposables" },
    ],
  },
  {
    name: "Consumer Goods",
    categories: [
      { label: "Furniture & Wood Products", value: "furniture-wood" },
      { label: "Textiles & Apparel", value: "textiles-apparel" },
      { label: "Footwear & Leather Goods", value: "footwear-leather" },
      { label: "Household & Kitchen Products", value: "household-kitchen" },
      { label: "Toys & Juvenile Products", value: "toys-juvenile" },
      { label: "Sporting Goods & Recreation", value: "sporting-goods" },
      { label: "Cosmetics, Personal Care & Fragrances", value: "cosmetics-personal-care" },
      { label: "Jewelry & Accessories", value: "jewelry-accessories" },
    ],
  },
  {
    name: "Construction & Building",
    categories: [
      { label: "Building Materials (Cement, Aggregate)", value: "building-materials" },
      { label: "Lumber & Wood Products", value: "lumber-wood" },
      { label: "Windows, Doors & Glass", value: "windows-doors-glass" },
      { label: "Flooring & Tile", value: "flooring-tile" },
      { label: "Plumbing Fixtures & Fittings", value: "plumbing-fixtures" },
      { label: "Roofing & Insulation", value: "roofing-insulation" },
      { label: "Hardware & Tools", value: "hardware-tools" },
    ],
  },
  {
    name: "Other Industries",
    categories: [
      { label: "Paper & Packaging", value: "paper-packaging" },
      { label: "Printing & Publishing", value: "printing-publishing" },
      { label: "Musical Instruments", value: "musical-instruments" },
      { label: "Educational & Training Equipment", value: "education-equipment" },
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
