import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-primary py-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <span className="font-serif text-lg text-text-primary">
              Propeller
            </span>
            <div className="flex items-center gap-6 text-sm text-text-tertiary">
              <Link href="#agents" className="hover:text-text-primary transition-colors">Agents</Link>
              <Link href="#workflow" className="hover:text-text-primary transition-colors">Workflow</Link>
              <Link href="#data-sources" className="hover:text-text-primary transition-colors">Data Sources</Link>
              <Link href="/dashboard" className="hover:text-text-primary transition-colors">App</Link>
            </div>
          </div>
          <p className="text-sm text-text-muted">
            &copy; 2026 Propeller Labs
          </p>
        </div>
      </div>
    </footer>
  );
}
