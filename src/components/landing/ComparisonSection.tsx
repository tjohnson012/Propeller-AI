"use client";

import { comparisonData } from "@/lib/constants";
import { FadeUp } from "@/components/ui/FadeUp";

export function ComparisonSection() {
  const highlightRows = ["Total Annual Cost", "Time to First Export"];

  return (
    <section id="comparison" className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6">
            Pricing
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            Replace a $320K team
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            Everything you need to export — without the headcount.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="rounded-xl border border-border-primary overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-bg-secondary">
                  <th className="text-left p-4 text-text-muted text-[11px] font-mono tracking-widest uppercase" />
                  <th className="text-center p-4 text-text-muted text-[11px] font-mono tracking-widest uppercase">
                    Traditional
                  </th>
                  <th className="text-center p-4 text-accent text-[11px] font-mono font-bold tracking-widest uppercase">
                    Propeller
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.categories.map((cat, i) => {
                  const isHighlight = highlightRows.includes(cat);
                  return (
                    <tr
                      key={cat}
                      className={`${
                        i < comparisonData.categories.length - 1
                          ? "border-b border-border-subtle"
                          : ""
                      } ${isHighlight ? "bg-bg-surface" : ""}`}
                    >
                      <td className="p-4 text-text-primary text-sm">{cat}</td>
                      <td className="p-4 text-center">
                        <span className="text-text-muted font-mono text-sm">
                          {comparisonData.traditional[i]}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-accent font-mono text-sm font-medium">
                          {comparisonData.propeller[i]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
