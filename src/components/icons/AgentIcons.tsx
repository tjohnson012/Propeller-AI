import { type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Market Intelligence — globe with trade route arcs */
export function MarketIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Globe outline */}
      <circle cx="12" cy="12" r="10" />
      {/* Equator */}
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      {/* Meridian */}
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      {/* Trade route arc */}
      <path d="M4 8c3-4 10-4 16 0" strokeWidth="2" strokeDasharray="2 2" />
    </svg>
  );
}

/** Trade Compliance — shield with checkmark */
export function ComplianceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Shield body */}
      <path d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25 5.17-1.1 9-6 9-11.25V7l-9-5z" />
      {/* Checkmark */}
      <path d="M8.5 12.5l2.5 2.5 5-5" strokeWidth="2" />
    </svg>
  );
}

/** Buyer Outreach — connected nodes / network */
export function OutreachIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Connection lines */}
      <line x1="6" y1="6" x2="12" y2="12" />
      <line x1="18" y1="6" x2="12" y2="12" />
      <line x1="12" y1="12" x2="6" y2="18" />
      <line x1="12" y1="12" x2="18" y2="18" />
      {/* Nodes */}
      <circle cx="6" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Export Finance — document with seal/stamp */
export function FinanceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Document */}
      <path d="M5 3a1 1 0 011-1h8l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3z" />
      <path d="M14 2v5h5" />
      {/* Dollar sign */}
      <path d="M12 10v6" strokeWidth="1.5" />
      <path d="M9.5 11.5c0-.83.9-1.5 2.5-1.5s2.5.5 2.5 1.5c0 1.5-5 1.5-5 3 0 1 .9 1.5 2.5 1.5s2.5-.67 2.5-1.5" strokeWidth="1.5" />
    </svg>
  );
}
