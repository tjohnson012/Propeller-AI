"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  total?: number;
}

export default function SearchBar({ value, onChange, resultCount, total }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search trade shows by name, industry, location..."
        className="w-full pl-11 pr-20 py-3 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {value && resultCount !== undefined && (
        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-text-muted">
          {resultCount}{total !== undefined && total > resultCount ? ` of ${total}` : ""}
        </span>
      )}
    </div>
  );
}
