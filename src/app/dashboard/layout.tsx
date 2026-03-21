"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { AgentStatusBar } from "@/components/dashboard/AgentStatusBar";
import { ArtifactPanel } from "@/components/dashboard/ArtifactPanel";
import { TourOverlay } from "@/components/dashboard/TourOverlay";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarExpanded = useAppStore((s) => s.sidebarExpanded);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-200 overflow-hidden",
          sidebarExpanded ? "ml-56" : "ml-12"
        )}
      >
        <AgentStatusBar />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
          <ArtifactPanel />
        </div>
      </div>
      <TourOverlay />
    </div>
  );
}
