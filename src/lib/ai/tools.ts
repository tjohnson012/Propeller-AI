import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definitions for AI agents
 * These are the real capabilities that differentiate Propeller from a chatbot
 */

export const MARKET_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_trade_flows",
    description:
      "Query UN Comtrade for real international trade flow data. Returns top importing/exporting countries for a given HS code with trade values, shares, and volumes.",
    input_schema: {
      type: "object" as const,
      properties: {
        hs_code: {
          type: "string",
          description: "HS code to search (e.g., '8481.80' for industrial valves)",
        },
        reporter_country: {
          type: "string",
          description: "Reporting country (e.g., 'Germany', 'world' for global)",
        },
        direction: {
          type: "string",
          enum: ["import", "export"],
          description: "Trade direction — import or export",
        },
      },
      required: ["hs_code"],
    },
  },
  {
    name: "classify_hs_code",
    description:
      "Search the Harmonized Tariff Schedule to find the correct HS code for a product description. Returns suggested codes with confidence scores and duty rates.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_description: {
          type: "string",
          description: "Description of the product to classify (e.g., 'industrial ball valves')",
        },
      },
      required: ["product_description"],
    },
  },
  {
    name: "get_hs_details",
    description:
      "Look up detailed information for a specific HS code including duty rates, FTA eligibility, and special programs.",
    input_schema: {
      type: "object" as const,
      properties: {
        hs_code: {
          type: "string",
          description: "The HS code to look up (e.g., '8481.80')",
        },
        destination_country: {
          type: "string",
          description: "Destination country to check FTA eligibility",
        },
      },
      required: ["hs_code"],
    },
  },
  {
    name: "generate_market_report",
    description:
      "Generate a formal market research report document summarizing all findings. Must be called as the LAST step after all research is complete. Creates a downloadable report with HS codes, top markets, trade values, and recommendations.",
    input_schema: {
      type: "object" as const,
      properties: {
        company_name: {
          type: "string",
          description: "Name of the exporting company",
        },
        product_description: {
          type: "string",
          description: "Product being analyzed",
        },
        hs_codes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              description: { type: "string" },
              duty_rate: { type: "string" },
            },
            required: ["code", "description"],
          },
          description: "HS codes identified for this product",
        },
        top_markets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              country: { type: "string" },
              import_value: { type: "string" },
              share: { type: "string" },
              recommendation: { type: "string" },
            },
            required: ["country", "import_value"],
          },
          description: "Top importing countries with trade data",
        },
        summary: {
          type: "string",
          description: "Executive summary of findings and recommendations",
        },
      },
      required: ["company_name", "product_description", "hs_codes", "top_markets", "summary"],
    },
  },
];

export const COMPLIANCE_TOOLS: Anthropic.Tool[] = [
  {
    name: "screen_entity",
    description:
      "Screen a company/person name against the US Government Consolidated Screening List (25,000+ entries across 13 federal lists: OFAC SDN, BIS Entity List, BIS Denied Persons, BIS Unverified, BIS Military End User, ITAR Debarred, Nonproliferation Sanctions, OFAC SSI, OFAC FSE, OFAC CMIC, OFAC PLC, OFAC CAP, OFAC NS-MBS). Returns match results with confidence scores and source list identification.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_name: {
          type: "string",
          description: "Name of the entity to screen (company name or person name)",
        },
      },
      required: ["entity_name"],
    },
  },
  {
    name: "screen_entities_batch",
    description:
      "Screen multiple entities against the US Government Consolidated Screening List (13 federal lists, 25,000+ entries) in batch. More efficient than screening one at a time.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_names: {
          type: "array",
          items: { type: "string" },
          description: "List of entity names to screen",
        },
      },
      required: ["entity_names"],
    },
  },
  {
    name: "check_export_controls",
    description:
      "Check if a product (by HS code) requires an export license for a given destination. Looks up ECCN classification and license requirements.",
    input_schema: {
      type: "object" as const,
      properties: {
        hs_code: {
          type: "string",
          description: "HS code of the product",
        },
        destination_country: {
          type: "string",
          description: "Destination country",
        },
      },
      required: ["hs_code", "destination_country"],
    },
  },
  {
    name: "check_fta_eligibility",
    description:
      "Check Free Trade Agreement eligibility for a product and destination country. Returns applicable FTAs and potential duty savings.",
    input_schema: {
      type: "object" as const,
      properties: {
        hs_code: {
          type: "string",
          description: "HS code of the product",
        },
        destination_country: {
          type: "string",
          description: "Destination country",
        },
      },
      required: ["hs_code", "destination_country"],
    },
  },
  {
    name: "generate_screening_report",
    description:
      "Generate a formal compliance screening report document for an entity. Creates a structured report with all lists checked, ECCN classification, and compliance status. The user can download this as a PDF.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_name: {
          type: "string",
          description: "Name of the screened entity",
        },
        screening_result: {
          type: "string",
          enum: ["CLEAR", "FLAGGED"],
          description: "Overall screening result",
        },
        hs_code: {
          type: "string",
          description: "HS code of the product being exported",
        },
        destination_country: {
          type: "string",
          description: "Destination country",
        },
        match_details: {
          type: "string",
          description: "Details of any matches found (for flagged entities)",
        },
        notes: {
          type: "string",
          description: "Additional compliance notes or recommendations",
        },
      },
      required: ["entity_name", "screening_result"],
    },
  },
];

export const OUTREACH_TOOLS: Anthropic.Tool[] = [
  {
    name: "draft_outreach_email",
    description:
      "Draft a personalized outreach email to a potential buyer. Uses product details, buyer company info, and cultural context to write effective outreach.",
    input_schema: {
      type: "object" as const,
      properties: {
        buyer_company: {
          type: "string",
          description: "Name of the buyer company",
        },
        buyer_country: {
          type: "string",
          description: "Country of the buyer",
        },
        product_description: {
          type: "string",
          description: "Description of the product being sold",
        },
        hs_code: {
          type: "string",
          description: "HS code of the product",
        },
        key_specs: {
          type: "string",
          description: "Key product specifications to highlight",
        },
      },
      required: ["buyer_company", "buyer_country", "product_description"],
    },
  },
  {
    name: "generate_followup",
    description: "Generate a follow-up email for a buyer who hasn't responded.",
    input_schema: {
      type: "object" as const,
      properties: {
        buyer_company: { type: "string", description: "Buyer company name" },
        days_since_initial: { type: "number", description: "Days since initial outreach" },
        context: { type: "string", description: "Any additional context" },
      },
      required: ["buyer_company", "days_since_initial"],
    },
  },
  {
    name: "generate_outreach_package",
    description:
      "Generate a complete outreach email package document. Must be called as the LAST step after drafting emails. Creates a downloadable document with all outreach emails, follow-up sequences, and talking points for sales calls.",
    input_schema: {
      type: "object" as const,
      properties: {
        company_name: {
          type: "string",
          description: "Name of the exporting company",
        },
        target_country: {
          type: "string",
          description: "Primary target market country",
        },
        emails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              to_company: { type: "string" },
              subject: { type: "string" },
              body: { type: "string" },
            },
            required: ["to_company", "subject", "body"],
          },
          description: "Outreach emails drafted",
        },
        product_description: {
          type: "string",
          description: "Product being sold",
        },
        hs_code: {
          type: "string",
          description: "HS code for the product",
        },
      },
      required: ["company_name", "target_country", "emails", "product_description"],
    },
  },
];

export const FINANCE_TOOLS: Anthropic.Tool[] = [
  {
    name: "recommend_payment_terms",
    description:
      "Recommend payment terms for an export transaction. Considers buyer country risk, relationship type, and transaction value to suggest appropriate instruments (LC, open account, etc.).",
    input_schema: {
      type: "object" as const,
      properties: {
        buyer_country: {
          type: "string",
          description: "Country of the buyer",
        },
        transaction_value: {
          type: "string",
          description: "Estimated transaction value (e.g., '$50,000')",
        },
        relationship: {
          type: "string",
          enum: ["new", "established", "long-term"],
          description: "Relationship status with buyer",
        },
      },
      required: ["buyer_country"],
    },
  },
  {
    name: "estimate_duties",
    description:
      "Estimate import duties and taxes for a product in a destination country.",
    input_schema: {
      type: "object" as const,
      properties: {
        hs_code: { type: "string", description: "HS code" },
        destination_country: { type: "string", description: "Destination country" },
        value: { type: "string", description: "Declared value of goods" },
      },
      required: ["hs_code", "destination_country", "value"],
    },
  },
  {
    name: "find_export_financing",
    description:
      "Search for available export financing programs, including SBA STEP grants, Ex-Im Bank programs, and state-level export assistance.",
    input_schema: {
      type: "object" as const,
      properties: {
        company_state: {
          type: "string",
          description: "US state where the company is located (e.g., 'Ohio')",
        },
        export_value: {
          type: "string",
          description: "Estimated annual export value",
        },
        industry: {
          type: "string",
          description: "Industry sector",
        },
      },
      required: ["company_state"],
    },
  },
  {
    name: "generate_commercial_invoice",
    description:
      "Generate export documentation (commercial invoice) for a shipment. Creates a structured invoice with HS codes, export classification, screening status, and payment terms. The user can then download this as a PDF.",
    input_schema: {
      type: "object" as const,
      properties: {
        shipper_name: {
          type: "string",
          description: "Name of the exporting company",
        },
        consignee_name: {
          type: "string",
          description: "Name of the buyer/consignee",
        },
        consignee_country: {
          type: "string",
          description: "Buyer's country",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              hs_code: { type: "string" },
              quantity: { type: "number" },
              unit_price: { type: "number" },
            },
            required: ["description", "hs_code", "quantity", "unit_price"],
          },
          description: "Line items for the invoice",
        },
        payment_terms: {
          type: "string",
          description: "Payment terms (e.g., 'Irrevocable LC at sight')",
        },
        incoterm: {
          type: "string",
          description: "Incoterm (e.g., 'FOB', 'CIF', 'EXW')",
        },
      },
      required: ["shipper_name", "consignee_name", "consignee_country", "items"],
    },
  },
];
