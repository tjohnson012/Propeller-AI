"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  Calendar,
  Globe,
  Star,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";
import SearchBar from "@/components/trade-events/SearchBar";
import TradeEventFilters from "@/components/trade-events/TradeEventFilters";
import TradeEventCard from "@/components/trade-events/TradeEventCard";
import Pagination from "@/components/trade-events/Pagination";
import TradeEventDetailModal from "@/components/trade-events/TradeEventDetailModal";
import {
  useTradeEvents,
  useTradeEventFilters,
  useBookmarks,
  type TradeEventDB,
  type TradeEventFilters as Filters,
} from "@/hooks/useTradeEvents";

export default function TradeEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
        </div>
      }
    >
      <TradeEventsContent />
    </Suspense>
  );
}

function TradeEventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productProfile = useAppStore((s) => s.productProfile);

  // Track visit for onboarding hub
  useEffect(() => {
    localStorage.setItem("propeller_visited_trade_events", "true");
  }, []);

  // Derive filters from URL params
  const [filters, setFiltersState] = useState<Filters>(() => ({
    q: searchParams.get("q") || "",
    industry: searchParams.get("industry") || "",
    region: searchParams.get("region") || "",
    country: searchParams.get("country") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    source: searchParams.get("source") || "",
    featured: searchParams.get("featured") === "true",
    sort: (searchParams.get("sort") as "date" | "name") || "date",
    page: parseInt(searchParams.get("page") || "1", 10),
    limit: 24,
  }));

  // Sync filters to URL params
  const updateFilters = useCallback(
    (partial: Partial<Filters>) => {
      setFiltersState((prev) => {
        const next = { ...prev, ...partial };
        const params = new URLSearchParams();
        if (next.q) params.set("q", next.q);
        if (next.industry) params.set("industry", next.industry);
        if (next.region) params.set("region", next.region);
        if (next.country) params.set("country", next.country);
        if (next.dateFrom) params.set("dateFrom", next.dateFrom);
        if (next.dateTo) params.set("dateTo", next.dateTo);
        if (next.source) params.set("source", next.source);
        if (next.featured) params.set("featured", "true");
        if (next.sort && next.sort !== "date") params.set("sort", next.sort);
        if (next.page && next.page > 1) params.set("page", String(next.page));
        const qs = params.toString();
        router.replace(`/dashboard/trade-events${qs ? `?${qs}` : ""}`, { scroll: false });
        return next;
      });
    },
    [router],
  );

  const clearAllFilters = useCallback(() => {
    updateFilters({
      q: "",
      industry: "",
      region: "",
      country: "",
      dateFrom: "",
      dateTo: "",
      source: "",
      featured: false,
      sort: "date",
      page: 1,
    });
  }, [updateFilters]);

  // Data hooks
  const { events, total, totalPages, loading } = useTradeEvents(filters);
  const { filters: filterOptions, loading: filtersLoading } = useTradeEventFilters();
  const { bookmarks, toggleBookmark } = useBookmarks();

  // Recommended events (featured + matches user profile)
  const [recommended, setRecommended] = useState<TradeEventDB[]>([]);
  useEffect(() => {
    if (!productProfile) return;

    async function loadRecommended() {
      try {
        const params = new URLSearchParams();
        params.set("featured", "true");
        params.set("limit", "12");
        const res = await fetch(`/api/trade-events?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const all: TradeEventDB[] = data.events ?? [];

        // Score by profile relevance
        const category = productProfile!.category?.toLowerCase() || "";
        const categoryWords = category.split(/[\s,;&/+\-()]+/).filter((w: string) => w.length > 2);
        const markets = productProfile!.targetMarkets?.map((m: string) => m.toLowerCase()) || [];

        const scored = all.map((e) => {
          const text = (e.name + " " + e.description + " " + e.industries.join(" ")).toLowerCase();
          const country = e.country.toLowerCase();
          let score = 0;
          if (categoryWords.some((w: string) => text.includes(w))) score += 2;
          if (markets.some((m: string) => country.includes(m) || text.includes(m))) score += 1;
          return { event: e, score };
        });

        setRecommended(
          scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map((s) => s.event),
        );
      } catch {
        // Ignore — recommendation is optional
      }
    }

    loadRecommended();
  }, [productProfile]);

  // Detail modal
  const [detailEvent, setDetailEvent] = useState<TradeEventDB | null>(null);

  // Count unique countries
  const countryCount = useMemo(() => {
    return new Set(events.map((e) => e.country).filter(Boolean)).size;
  }, [events]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-serif text-text-primary">Trade Show Directory</h1>
          <p className="text-sm text-text-muted mt-1">
            {total > 0
              ? `${total} upcoming trade shows across ${countryCount} countries`
              : loading
                ? "Loading directory..."
                : "No events found"}
          </p>
        </div>

        {/* Search bar */}
        <SearchBar
          value={filters.q || ""}
          onChange={(q) => updateFilters({ q, page: 1 })}
          resultCount={events.length}
          total={total}
        />

        {/* Recommended for you */}
        {recommended.length > 0 && !filters.q && !filters.industry && !filters.region && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-medium text-text-primary">Recommended for You</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {recommended.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setDetailEvent(event)}
                  className="surface-card border-l-4 border-l-accent p-4 hover:bg-bg-tertiary/50 transition-colors group min-w-[260px] max-w-[300px] shrink-0 text-left"
                >
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                    {event.name}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatShortDate(event.start_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.city || event.country}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {!filtersLoading && (
          <TradeEventFilters
            filters={filters}
            options={filterOptions}
            onChange={updateFilters}
            onClearAll={clearAllFilters}
          />
        )}

        {/* Result count */}
        {filters.q && !loading && (
          <p className="text-xs text-text-muted">
            {total} event{total !== 1 ? "s" : ""} matching &quot;{filters.q}&quot;
          </p>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
          </div>
        )}

        {/* Events grid */}
        {!loading && events.length === 0 && (
          <div className="surface-card p-8 text-center">
            <Calendar className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
            <p className="text-sm text-text-secondary">No events match your filters</p>
            <p className="text-xs text-text-muted mt-1">Try broadening your search criteria</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((event) => (
              <TradeEventCard
                key={event.id}
                event={event}
                isBookmarked={bookmarks.has(event.id)}
                onToggleBookmark={toggleBookmark}
                onViewDetail={setDetailEvent}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Pagination
            page={filters.page || 1}
            totalPages={totalPages}
            total={total}
            limit={filters.limit || 24}
            onChange={(page) => updateFilters({ page })}
          />
        )}

        {/* Sources footer */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-bg-secondary/50 border border-border-primary">
          <Globe className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
          <div className="text-xs text-text-muted leading-relaxed">
            <p>
              Events sourced from the{" "}
              <span className="text-text-secondary">U.S. Trade and Development Agency</span>,{" "}
              <span className="text-text-secondary">International Trade Administration</span>,{" "}
              <span className="text-text-secondary">10times.com</span>,{" "}
              <span className="text-text-secondary">EventsEye</span>, and
              curated major international trade shows. STEP Grant funds can be used for trade show
              attendance and trade missions.
            </p>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <TradeEventDetailModal
        event={detailEvent}
        isBookmarked={detailEvent ? bookmarks.has(detailEvent.id) : false}
        onToggleBookmark={toggleBookmark}
        onClose={() => setDetailEvent(null)}
      />
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}
