"use client";

import { dataSources } from "@/lib/constants";
import { FadeUp } from "@/components/ui/FadeUp";

export function DataSourcesSection() {
  return (
    <section id="data-sources" className="py-24 border-t border-border-primary">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6">
            Connected Sources
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            Real data. Not hallucinations.
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            Every response is grounded in live government databases and official
            trade data.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border-primary rounded-xl overflow-hidden">
          {dataSources.map((source, i) => (
            <FadeUp key={source.name} delay={i * 0.05}>
              <div className="bg-bg-primary p-6 h-full">
                <p className="text-sm text-text-primary font-medium font-mono mb-1.5">
                  {source.name}
                </p>
                <p className="text-xs text-text-tertiary leading-relaxed">
                  {source.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
