"use client";

import { Button } from "@/components/ui/Button";
import { FadeUp } from "@/components/ui/FadeUp";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center pt-14 pb-20 overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* Subtle radial glow */}
      <div
        className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 w-full">
        <FadeUp>
          <p className="text-sm text-text-tertiary tracking-wide mb-8 font-mono">
            Built for Ohio manufacturers
          </p>
        </FadeUp>

        <FadeUp delay={0.05}>
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] leading-[0.9] tracking-[-0.04em] mb-8 text-text-primary">
            Export globally.
            <br />
            <span className="text-shimmer">Fully automated.</span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.15}>
          <p className="text-lg md:text-xl text-text-secondary max-w-lg leading-relaxed mb-12 tracking-[-0.01em]">
            Four AI agents plus continuous compliance monitoring. Connected to
            11 government databases, not just an LLM.
          </p>
        </FadeUp>

        <FadeUp delay={0.25}>
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <Button size="lg">
                Try the Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link
              href="#workflow"
              className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
            >
              See how it works
            </Link>
          </div>
        </FadeUp>

        {/* Data source marquee */}
        <FadeUp delay={0.35}>
          <div className="mt-24 overflow-hidden">
            <div className="marquee-track">
              {[...Array(2)].map((_, setIdx) => (
                <div key={setIdx} className="flex items-center gap-8 mr-8">
                  {[
                    "OFAC SDN List",
                    "UN Comtrade",
                    "USITC HTS",
                    "BIS Entity List",
                    "EU Consolidated List",
                    "Trade.gov APIs",
                    "UN Security Council",
                    "Census Bureau",
                    "Federal Register",
                    "FTA Tariff Rates",
                    "WITS Tariff Data",
                  ].map((source, i) => (
                    <span
                      key={`${setIdx}-${i}`}
                      className="text-[13px] text-text-muted font-mono whitespace-nowrap"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
