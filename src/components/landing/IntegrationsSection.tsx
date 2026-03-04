"use client";

import { FadeUp } from "@/components/ui/FadeUp";
import { SlackLogo, GmailLogo, GoogleSheetsLogo, QuickBooksLogo } from "@/components/icons/IntegrationLogos";
import { type ComponentType, type SVGProps } from "react";

const integrations: {
  name: string;
  description: string;
  Logo: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  {
    name: "Slack",
    description: "Screen entities and classify products from any channel with /propeller commands.",
    Logo: SlackLogo,
  },
  {
    name: "Gmail",
    description: "Forward buyer emails for auto-analysis, OFAC screening, and AI-drafted replies.",
    Logo: GmailLogo,
  },
  {
    name: "Google Sheets",
    description: "Import product catalogs, run bulk screening, and export buyer lists to spreadsheets.",
    Logo: GoogleSheetsLogo,
  },
  {
    name: "QuickBooks",
    description: "Sync inventory for HS classification, screen customers, and tag export invoices.",
    Logo: QuickBooksLogo,
  },
];

export function IntegrationsSection() {
  return (
    <section className="py-24 border-t border-border-primary">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6 font-mono">
            Integrations
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            Works where you work
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            Propeller plugs into the tools your team already uses. No context switching.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((integration, i) => (
            <FadeUp key={integration.name} delay={i * 0.08}>
              <div className="group flex items-start gap-4 p-5 rounded-xl bg-bg-secondary border border-border-primary hover:border-border-hover transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.06]">
                  <integration.Logo className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-text-primary mb-1">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-text-tertiary leading-relaxed">
                    {integration.description}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
