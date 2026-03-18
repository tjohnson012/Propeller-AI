"use client";

import { FadeUp } from "@/components/ui/FadeUp";
import { Shield, Bell, FileText } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Daily Auto-Screening",
    description:
      "Every active entity re-screened against the Consolidated Screening List at 6 AM UTC daily.",
  },
  {
    icon: Bell,
    title: "Change Alerts",
    description:
      "Get notified when a partner is added to, removed from, or modified on any screening list.",
  },
  {
    icon: FileText,
    title: "Regulatory Updates",
    description:
      "Federal Register monitoring surfaces new BIS rules, Entity List additions, and OFAC sanctions changes.",
  },
];

export function MonitoringSection() {
  return (
    <section id="monitoring" className="py-24 border-t border-border-primary">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6 font-mono">
            Continuous Compliance
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            Sleep easy. We&apos;re watching.
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            Add any trade partner to your watchlist. Propeller screens them daily
            against all 13 federal lists and alerts you the moment something
            changes.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {features.map((feature, i) => (
            <FadeUp key={feature.title} delay={i * 0.08}>
              <div className="rounded-xl border border-border-primary bg-bg-secondary p-6 h-full">
                <div className="w-10 h-10 rounded-lg bg-agent-compliance-muted flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-agent-compliance" />
                </div>
                <h3 className="text-base font-medium text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.3}>
          <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">
                Haas Automation paid $2.5M in penalties for $29,254 in parts
              </span>{" "}
              — because they didn&apos;t re-screen existing customers when lists
              updated.
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
