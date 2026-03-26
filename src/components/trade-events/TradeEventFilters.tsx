"use client";

import { X } from "lucide-react";
import type { FilterOptions, TradeEventFilters as Filters } from "@/hooks/useTradeEvents";

interface TradeEventFiltersProps {
  filters: Filters;
  options: FilterOptions;
  onChange: (filters: Partial<Filters>) => void;
  onClearAll: () => void;
}

export default function TradeEventFilters({
  filters,
  options,
  onChange,
  onClearAll,
}: TradeEventFiltersProps) {
  const hasActiveFilters =
    filters.industry || filters.region || filters.country || filters.source ||
    filters.featured || filters.dateFrom || filters.dateTo;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.industry) activeChips.push({ label: filters.industry, clear: () => onChange({ industry: "" }) });
  if (filters.region) activeChips.push({ label: filters.region, clear: () => onChange({ region: "" }) });
  if (filters.country) activeChips.push({ label: filters.country, clear: () => onChange({ country: "" }) });
  if (filters.source) activeChips.push({ label: `Source: ${filters.source}`, clear: () => onChange({ source: "" }) });
  if (filters.featured) activeChips.push({ label: "Featured", clear: () => onChange({ featured: false }) });
  if (filters.dateFrom) activeChips.push({ label: `From: ${filters.dateFrom}`, clear: () => onChange({ dateFrom: "" }) });
  if (filters.dateTo) activeChips.push({ label: `To: ${filters.dateTo}`, clear: () => onChange({ dateTo: "" }) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Industry */}
        <select
          value={filters.industry || ""}
          onChange={(e) => onChange({ industry: e.target.value, page: 1 })}
          className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="">All Industries</option>
          {options.industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>

        {/* Region */}
        <select
          value={filters.region || ""}
          onChange={(e) => onChange({ region: e.target.value, page: 1 })}
          className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="">All Regions</option>
          {options.regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Country */}
        <select
          value={filters.country || ""}
          onChange={(e) => onChange({ country: e.target.value, page: 1 })}
          className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="">All Countries</option>
          {options.countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Source */}
        {options.sources.length > 1 && (
          <select
            value={filters.source || ""}
            onChange={(e) => onChange({ source: e.target.value, page: 1 })}
            className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
          >
            <option value="">All Sources</option>
            {options.sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Featured toggle */}
        <button
          onClick={() => onChange({ featured: !filters.featured, page: 1 })}
          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
            filters.featured
              ? "bg-accent/10 border-accent text-accent"
              : "bg-bg-secondary border-border-primary text-text-muted hover:text-text-secondary"
          }`}
        >
          Featured
        </button>

        {/* Sort */}
        <select
          value={filters.sort || "date"}
          onChange={(e) => onChange({ sort: e.target.value as "date" | "name" })}
          className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="date">Sort: Date</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-xs text-accent"
            >
              {chip.label}
              <button onClick={chip.clear} className="hover:text-accent/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-text-muted hover:text-text-secondary underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
