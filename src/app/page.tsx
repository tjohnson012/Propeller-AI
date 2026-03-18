import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TerminalMockup } from "@/components/landing/TerminalMockup";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { AgentsSection } from "@/components/landing/AgentsSection";
import { MonitoringSection } from "@/components/landing/MonitoringSection";
import { DataSourcesSection } from "@/components/landing/DataSourcesSection";
import { WorkspacePreview } from "@/components/landing/WorkspacePreview";
import { StatBar } from "@/components/landing/StatBar";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TerminalMockup />
        <StatBar />
        <ProblemSection />
        <AgentsSection />
        <MonitoringSection />
        <DataSourcesSection />
        <WorkspacePreview />
        <WorkflowSection />
        <IntegrationsSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
