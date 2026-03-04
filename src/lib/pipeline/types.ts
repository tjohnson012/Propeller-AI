/**
 * Deterministic Pipeline Types
 *
 * The pipeline runs data operations directly (no LLM needed),
 * then makes ONE LLM call at the end for synthesis.
 */

import type { HSCodeSuggestion } from "@/lib/data/hts";
import type { TradePartner } from "@/lib/data/comtrade";

export interface PipelineInput {
  companyName: string;
  product: string;
  targetCountries: string[];
  companyState?: string;
}

export interface PipelineContext extends PipelineInput {
  // Step 1: Classification (deterministic)
  hsCodes: HSCodeSuggestion[];

  // Step 2: Trade flows (API call, no LLM)
  tradeFlows: Array<{
    hsCode: string;
    partners: TradePartner[];
    totalValue: number;
  }>;

  // Step 3: Screening (API call, no LLM)
  screening: {
    status: "CLEAR" | "FLAGGED";
    entityName: string;
    matchCount: number;
    listsChecked: number;
    details: string;
  };

  // Step 4: Export controls (deterministic)
  exportControls: {
    hsCode: string;
    destination: string;
    eccn: string;
    licenseRequired: boolean;
    restrictions: string[];
    ftaEligible: boolean;
    ftaSavings: string;
  };

  // Step 5: Synthesis (ONE LLM call)
  summary: string;
  recommendations: string[];

  // Generated artifacts
  marketReport: string;
  complianceReport: string;
  outreachEmail: string;
  financeSummary: string;
}

export interface PipelineEvent {
  type:
    | "step-start"
    | "step-done"
    | "step-error"
    | "data"
    | "artifact"
    | "message"
    | "done";
  step?: string;
  label?: string;
  progress?: number;
  data?: unknown;
  text?: string;
  artifact?: {
    type: "table" | "document" | "report";
    title: string;
    content: string;
  };
  agentId?: string;
}
