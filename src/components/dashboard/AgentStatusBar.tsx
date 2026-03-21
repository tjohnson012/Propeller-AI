"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { agents, agentColorMap, sidebarLinks } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AgentStatusBar() {
  const pathname = usePathname();
  const agentStatuses = useAppStore((s) => s.agentStatuses);

  const currentLink = sidebarLinks.find((l) =>
    l.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(l.href)
  );
  const pageTitle = currentLink?.label ?? "Dashboard";

  return (
    <div data-tour="agent-status-bar" className="h-10 flex items-center justify-between px-4 border-b border-border-primary bg-bg-primary shrink-0">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-text-muted font-mono text-xs">propeller</span>
        <span className="text-text-muted">/</span>
        <span className="text-text-secondary text-xs">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        {agents.map((agent) => {
          const status = agentStatuses.find((s) => s.agentId === agent.id);
          const colors = agentColorMap[agent.id];
          const isWorking = status?.status === "working";
          const isComplete = status?.status === "complete";

          return (
            <div key={agent.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  colors.dot,
                  isWorking && "animation-status-pulse"
                )}
              />
              <agent.icon className={cn("w-3 h-3", isWorking || isComplete ? colors.text : "text-text-muted")} />
              <span className="text-[11px] text-text-muted max-w-[100px] truncate hidden lg:block font-mono">
                {status?.currentTask ?? "idle"}
              </span>
              {isWorking && status && (
                <div className="w-12 h-1 rounded-full bg-bg-tertiary overflow-hidden hidden lg:block">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", colors.dot)}
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
