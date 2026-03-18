"use client";

import { Button } from "@/components/ui/Button";
import { FadeUp } from "@/components/ui/FadeUp";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="relative py-32 border-t border-border-primary overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6">
        <FadeUp>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-text-primary mb-6 tracking-[-0.03em]">
            Ready to go global?
          </h2>
          <p className="text-text-secondary text-lg max-w-md mb-10 leading-relaxed">
            Screen entities against live OFAC data, monitor your trade partners
            24/7, browse upcoming trade events, and get AI-powered export
            guidance.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <Button size="lg">
                Open the Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-sm text-text-muted font-mono">
              Miami Valley SBDC
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
