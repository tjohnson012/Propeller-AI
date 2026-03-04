"use client";

import { FadeUp } from "@/components/ui/FadeUp";

export function ProblemSection() {
  return (
    <section className="py-32">
      <div className="max-w-4xl mx-auto px-6">
        <FadeUp>
          <p className="text-2xl sm:text-3xl md:text-4xl text-text-secondary leading-[1.4] tracking-[-0.02em]">
            <span className="text-text-primary font-medium">
              Half of US manufacturers don&apos;t export at all.
            </span>{" "}
            Not because their products aren&apos;t competitive, but because
            navigating trade compliance, finding buyers, and managing export
            finance requires expertise most small teams can&apos;t afford.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
