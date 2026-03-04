import { cn } from "@/lib/utils";
import type { AgentId } from "@/lib/constants";
import { agentColorMap } from "@/lib/constants";

interface StatusDotProps {
  agentId?: AgentId;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ agentId, pulse = true, className }: StatusDotProps) {
  const color = agentId ? agentColorMap[agentId].dot : "bg-accent";
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        color,
        pulse && "animation-status-pulse",
        className
      )}
    />
  );
}
