"use client";

import { useState, useEffect, useRef } from "react";
import { FadeUp } from "@/components/ui/FadeUp";

const terminalLines = [
  { agent: "Market Intelligence", color: "text-agent-market", text: "Scanning trade flows for HS 8481.80 (industrial valves)...", time: "09:00:05" },
  { agent: "Market Intelligence", color: "text-agent-market", text: "Found 847 qualified buyers across 12 markets. Top: Germany, Canada, Mexico.", time: "09:01:30" },
  { agent: "Compliance", color: "text-agent-compliance", text: "Running sanctions screening on 847 entities... Clear.", time: "09:01:35" },
  { agent: "Compliance", color: "text-agent-compliance", text: "FTA eligibility: USMCA (Mexico), CETA (Canada). Duty savings ~$42K/yr.", time: "09:02:45" },
  { agent: "Outreach", color: "text-agent-outreach", text: "Drafting outreach for top 50 buyers. Language: EN, DE, ES.", time: "09:04:00" },
  { agent: "Finance", color: "text-agent-finance", text: "Recommended terms: LC at sight for new buyers, open account for USMCA.", time: "09:05:00" },
  { agent: "Compliance", color: "text-agent-compliance", text: "Watchlist alert: \"Acme GmbH\" added to BIS Entity List (03/15/2026). Flagged.", time: "09:06:00" },
  { agent: "Compliance", color: "text-agent-compliance", text: "Federal Register: New BIS rule on semiconductor export controls published today.", time: "09:06:30" },
];

export function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visibleLines >= terminalLines.length) {
      const timeout = setTimeout(() => {
        setVisibleLines(0);
        setCurrentText("");
      }, 4000);
      return () => clearTimeout(timeout);
    }

    const line = terminalLines[visibleLines];
    let charIndex = 0;
    setCurrentText("");

    intervalRef.current = setInterval(() => {
      charIndex++;
      setCurrentText(line.text.slice(0, charIndex));
      if (charIndex >= line.text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setVisibleLines((v) => v + 1), 500);
      }
    }, 18);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visibleLines]);

  return (
    <FadeUp delay={0.2}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center px-4 py-2.5 border-b border-border-primary">
            <div className="flex items-center gap-1.5 mr-4">
              <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
            </div>
            <span className="text-xs text-text-muted font-mono">
              propeller · agent orchestrator
            </span>
          </div>

          {/* Terminal body */}
          <div className="p-6 font-mono text-[13px] leading-relaxed min-h-[280px]">
            {terminalLines.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="mb-2.5 flex gap-4">
                <span className="text-text-muted text-xs shrink-0 w-14 pt-px tabular-nums opacity-50">
                  {line.time}
                </span>
                <div>
                  <span className={`${line.color} font-medium`}>[{line.agent}]</span>{" "}
                  <span className="text-text-secondary">{line.text}</span>
                </div>
              </div>
            ))}
            {visibleLines < terminalLines.length && (
              <div className="mb-2.5 flex gap-4">
                <span className="text-text-muted text-xs shrink-0 w-14 pt-px tabular-nums opacity-50">
                  {terminalLines[visibleLines].time}
                </span>
                <div>
                  <span className={`${terminalLines[visibleLines].color} font-medium`}>
                    [{terminalLines[visibleLines].agent}]
                  </span>{" "}
                  <span className="text-text-secondary">{currentText}</span>
                  <span className="inline-block w-[7px] h-4 bg-text-tertiary ml-0.5 align-middle animation-cursor-blink" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FadeUp>
  );
}
