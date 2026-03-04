import { cn } from "@/lib/utils";
import type { AgentId } from "@/lib/constants";
import { agentColorMap } from "@/lib/constants";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  agentId?: AgentId;
  className?: string;
}

export function Badge({ children, agentId, className }: BadgeProps) {
  const colors = agentId
    ? agentColorMap[agentId]
    : { bg: "bg-accent-muted", text: "text-accent", border: "border-transparent" };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide",
        colors.bg,
        colors.text,
        className
      )}
    >
      {children}
    </span>
  );
}
