"use client";

import { agents, agentColorMap } from "@/lib/constants";
import { FadeUp } from "@/components/ui/FadeUp";

const agentDetails: Record<string, { caps: string[]; stat: string; statLabel: string }> = {
  market: {
    caps: ["UN Comtrade API", "Census Bureau Data", "Trade Events Calendar"],
    stat: "847",
    statLabel: "buyers found last scan",
  },
  compliance: {
    caps: ["Watchlist Monitoring", "Daily Auto-Screening", "FTA Tariff Lookup"],
    stat: "24/7",
    statLabel: "automated watchlist monitoring",
  },
  outreach: {
    caps: ["Cultural Adaptation", "Multi-language", "Follow-up Sequences"],
    stat: "3",
    statLabel: "languages supported",
  },
  finance: {
    caps: ["LC Structuring", "SBA STEP Grants", "Duty Estimation"],
    stat: "$42K",
    statLabel: "avg. duty savings found",
  },
};

export function AgentsSection() {
  return (
    <section id="agents" className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6 font-mono">
            AI Agents
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            Four agents. Real data.
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            Each agent connects to live government databases, not just an LLM.
          </p>
        </FadeUp>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent, i) => {
            const colors = agentColorMap[agent.id];
            const details = agentDetails[agent.id];
            const isLarge = i === 0 || i === 1;

            return (
              <FadeUp key={agent.id} delay={i * 0.08}>
                <div
                  className={`group relative rounded-xl border border-border-primary bg-bg-secondary p-6 hover:border-border-hover transition-all duration-300 overflow-hidden ${
                    isLarge ? "md:aspect-auto" : ""
                  }`}
                >
                  {/* Subtle gradient corner */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at top right, var(--agent-${agent.id}) 0%, transparent 70%)`,
                      opacity: 0,
                    }}
                  />
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at top right, var(--agent-${agent.id}) 0%, transparent 70%)`,
                    }}
                  />

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}
                        >
                          <agent.icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div>
                          <h3 className="text-base font-medium text-text-primary">
                            {agent.name}
                          </h3>
                          <p className={`text-xs ${colors.text}`}>{agent.title}</p>
                        </div>
                      </div>

                      {/* Stat */}
                      <div className="text-right">
                        <p className="font-mono text-2xl font-bold text-text-primary tracking-[-0.03em]">
                          {details.stat}
                        </p>
                        <p className="text-[11px] text-text-muted">{details.statLabel}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-text-secondary leading-relaxed mb-5">
                      {agent.description}
                    </p>

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-2">
                      {details.caps.map((cap) => (
                        <span
                          key={cap}
                          className="text-[11px] font-mono text-text-muted bg-bg-primary/60 border border-border-primary px-2.5 py-1 rounded-md"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
