"use client";

import { cn } from "@/lib/utils";
import type { AgentId } from "@/lib/constants";
import type { ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  agentId?: AgentId;
}

export function GlowCard({ children, className, agentId }: GlowCardProps) {
  return (
    <div
      className={cn(
        "surface-card p-5 transition-colors duration-150 hover:border-border-hover",
        className
      )}
    >
      {children}
    </div>
  );
}
