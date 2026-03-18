"use client";

import { workflowSteps } from "@/lib/constants";
import { FadeUp } from "@/components/ui/FadeUp";

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-24 border-t border-border-primary">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6">
            How It Works
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            From catalog to first export
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            Six steps. Four agents. One workspace.
          </p>
        </FadeUp>

        <div className="max-w-2xl">
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border-hover" />

            <div className="space-y-10">
              {workflowSteps.map((step, i) => (
                <FadeUp key={step.step} delay={i * 0.08}>
                  <div className="flex gap-6 relative">
                    <div className="w-10 h-10 rounded-full bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0 z-10">
                      <span className="font-mono text-sm font-bold text-text-primary">
                        {step.step}
                      </span>
                    </div>
                    <div className="pt-1.5">
                      <h3 className="text-base font-medium text-text-primary mb-1.5 tracking-[-0.01em]">
                        {step.title}
                      </h3>
                      <p className="text-text-secondary text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
