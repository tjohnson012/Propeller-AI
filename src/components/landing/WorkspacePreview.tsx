"use client";

import { FadeUp } from "@/components/ui/FadeUp";
import {
  Search,
  Shield,
  Mail,
  DollarSign,
  LayoutDashboard,
  TrendingUp,
  FileCheck,
  Users,
  Wallet,
  Zap,
  Send,
  FileText,
  User,
} from "lucide-react";

export function WorkspacePreview() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp>
          <p className="text-xs text-text-muted tracking-widest uppercase mb-6">
            The Workspace
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mb-4 tracking-[-0.03em]">
            Your AI export command center
          </h2>
          <p className="text-text-secondary text-base max-w-lg mb-14 leading-relaxed">
            A conversational workspace where four agents collaborate on your
            behalf.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="relative">
            {/* Glow behind preview */}
            <div
              className="absolute -inset-4 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.03) 0%, transparent 60%)",
              }}
            />
          <div className="relative rounded-xl border border-border-primary overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border-b border-border-primary">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-text-muted/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-text-muted/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-text-muted/20" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-[11px] text-text-muted font-mono">
                  app.propeller.ai/dashboard
                </span>
              </div>
            </div>

            {/* Workspace */}
            <div className="flex bg-bg-primary" style={{ height: 400 }}>
              {/* Sidebar */}
              <div className="w-12 bg-bg-secondary border-r border-border-primary flex flex-col shrink-0">
                <div className="h-10 flex items-center justify-center border-b border-border-primary">
                  <Zap className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
                  {[LayoutDashboard, TrendingUp, FileCheck, Users, Wallet].map(
                    (Icon, i) => (
                      <div
                        key={i}
                        className={`w-8 h-7 flex items-center justify-center ${
                          i === 0
                            ? "text-text-primary border-l-2 border-l-accent rounded-r"
                            : "text-text-muted"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Main */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Status bar */}
                <div className="h-9 flex items-center justify-between px-3 border-b border-border-primary bg-bg-secondary shrink-0">
                  <span className="text-[11px] text-text-tertiary">
                    Propeller <span className="text-text-muted">/</span> Dashboard
                  </span>
                  <div className="flex items-center gap-3">
                    {[
                      { Icon: Search, color: "bg-agent-market", label: "Done" },
                      { Icon: Shield, color: "bg-agent-compliance", label: "78%" },
                      { Icon: Mail, color: "bg-agent-outreach", label: "34%" },
                      { Icon: DollarSign, color: "bg-agent-finance", label: "Idle" },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${a.color} ${
                            i === 1 || i === 2 ? "animation-status-pulse" : ""
                          }`}
                        />
                        <a.Icon className="w-2.5 h-2.5 text-text-muted" />
                        <span className="text-[10px] text-text-muted hidden sm:block">
                          {a.label}
                        </span>
                      </div>
                    ))}
                    <div className="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center ml-1">
                      <User className="w-2.5 h-2.5 text-text-muted" />
                    </div>
                  </div>
                </div>

                {/* Chat + artifact */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Chat */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-hidden p-4 space-y-3">
                      {/* User */}
                      <div className="flex justify-end">
                        <div className="bg-bg-tertiary rounded-2xl rounded-br-sm px-3 py-2 max-w-[65%]">
                          <p className="text-xs text-text-primary">
                            Find German buyers for HS 8481.80
                          </p>
                        </div>
                      </div>

                      {/* Market agent */}
                      <div className="flex gap-2">
                        <div className="w-5 h-5 rounded-md bg-agent-market-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Search className="w-2.5 h-2.5 text-agent-market" />
                        </div>
                        <div>
                          <p className="text-[10px] text-agent-market mb-0.5">
                            Market Intelligence
                          </p>
                          <div className="bg-bg-surface rounded-2xl rounded-bl-sm px-3 py-2 border-l-2 border-l-agent-market">
                            <p className="text-xs text-text-secondary">
                              Found 23 qualified German buyers. Top: Bosch Rexroth (94%)
                            </p>
                          </div>
                          <div className="mt-1.5 bg-bg-surface border border-border-primary rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                            <FileText className="w-3 h-3 text-accent" />
                            <span className="text-[10px] text-text-primary">
                              German Buyer Matches
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Compliance agent */}
                      <div className="flex gap-2">
                        <div className="w-5 h-5 rounded-md bg-agent-compliance-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-2.5 h-2.5 text-agent-compliance" />
                        </div>
                        <div>
                          <p className="text-[10px] text-agent-compliance mb-0.5">
                            Trade Compliance
                          </p>
                          <div className="bg-bg-surface rounded-2xl rounded-bl-sm px-3 py-2 border-l-2 border-l-agent-compliance">
                            <p className="text-xs text-text-secondary">
                              22 cleared. 1 flagged: KSB (BIS match)
                            </p>
                          </div>
                          <div className="mt-1.5 bg-bg-surface border border-border-primary rounded-lg border-l-2 border-l-agent-compliance px-2.5 py-1.5">
                            <p className="text-[10px] text-text-primary mb-1">
                              Exclude KSB from outreach?
                            </p>
                            <div className="flex gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[9px] bg-agent-outreach-muted text-agent-outreach">
                                Approve
                              </span>
                              <span className="px-2 py-0.5 rounded text-[9px] bg-bg-tertiary text-text-muted">
                                Reject
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border-primary">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2 flex items-center">
                          <span className="text-[10px] text-text-muted">
                            Ask your agents anything...
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
                          <Send className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Artifact panel */}
                  <div className="w-48 border-l border-border-primary bg-bg-secondary flex-col hidden md:flex">
                    <div className="px-3 py-2 border-b border-border-primary">
                      <p className="text-[10px] text-text-primary font-medium truncate">
                        German Buyer Matches
                      </p>
                      <p className="text-[9px] text-text-muted">table</p>
                    </div>
                    <div className="flex-1 p-2 space-y-0.5 text-[8px]">
                      <div className="flex gap-2 px-1 py-0.5 text-text-muted">
                        <span className="w-4">#</span>
                        <span className="flex-1">Company</span>
                        <span className="w-7 text-right">Match</span>
                      </div>
                      {[
                        { n: "1", c: "Bosch Rexroth", m: "94%" },
                        { n: "2", c: "HYDAC Intl.", m: "91%" },
                        { n: "3", c: "Bürkert", m: "89%" },
                        { n: "4", c: "Festo SE", m: "87%" },
                        { n: "5", c: "Samson AG", m: "85%" },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 px-1 py-0.5 rounded text-text-secondary ${
                            i % 2 === 0 ? "bg-bg-surface" : ""
                          }`}
                        >
                          <span className="w-4 text-text-muted">{row.n}</span>
                          <span className="flex-1 truncate">{row.c}</span>
                          <span className="w-7 text-right text-accent">{row.m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
