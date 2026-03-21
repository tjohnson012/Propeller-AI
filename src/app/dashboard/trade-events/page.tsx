"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Globe,
  ExternalLink,
  Filter,
  List,
  Grid,
  Search,
  Star,
  Clock,
} from "lucide-react";

interface TradeEventDisplay {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  country: string;
  industries: string[];
  url: string;
  registrationUrl?: string;
  source: string;
  cost?: string;
}

type ViewMode = "list" | "calendar";

const INDUSTRY_FILTERS = [
  "All",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Energy",
  "Agriculture",
  "Automotive",
  "Aerospace & Defense",
];

const REGION_FILTERS = [
  "All Regions",
  "North America",
  "Europe",
  "Asia",
  "Latin America",
  "Middle East",
  "Africa",
];

const REGION_COUNTRIES: Record<string, string[]> = {
  "North America": ["united states", "canada", "mexico"],
  "Europe": ["germany", "france", "italy", "spain", "netherlands", "poland", "united kingdom", "switzerland", "austria", "belgium", "sweden", "norway", "denmark", "finland", "czech republic"],
  "Asia": ["china", "japan", "south korea", "india", "singapore", "vietnam", "thailand", "philippines", "indonesia", "malaysia", "taiwan", "bangladesh", "pakistan"],
  "Latin America": ["brazil", "colombia", "chile", "argentina", "peru", "panama", "costa rica", "ecuador", "uruguay"],
  "Middle East": ["united arab emirates", "saudi arabia", "israel", "jordan", "qatar", "bahrain", "oman", "kuwait"],
  "Africa": ["south africa", "nigeria", "kenya", "egypt", "morocco", "ghana", "ethiopia", "tanzania"],
};

export default function TradeEventsPage() {
  const productProfile = useAppStore((s) => s.productProfile);
  const [events, setEvents] = useState<TradeEventDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All Regions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Track visit for onboarding hub
  useEffect(() => {
    localStorage.setItem("propeller_visited_trade_events", "true");
  }, []);

  // Load trade events
  useEffect(() => {
    async function loadEvents() {
      try {
        // Use the trade-events module on the server via a simple API call
        // For now, we'll import client-side since it's static/curated data
        const { getTradeEvents, getMajorTradeShows } = await import("@/lib/data/trade-events");

        const industries = productProfile?.category ? [productProfile.category] : undefined;
        const countries = productProfile?.targetMarkets;

        const [liveEvents, majorShows] = await Promise.all([
          getTradeEvents({ industries, countries, maxResults: 30 }),
          Promise.resolve(
            getMajorTradeShows(
              productProfile?.category || "manufacturing",
              countries || [],
            ),
          ),
        ]);

        // Merge and deduplicate
        const allEvents = [...liveEvents];
        for (const show of majorShows) {
          if (!allEvents.some((e) => e.name.toLowerCase().includes(show.name.toLowerCase().slice(0, 15)))) {
            allEvents.push(show);
          }
        }

        // Sort by date
        allEvents.sort((a, b) => {
          const da = new Date(a.startDate).getTime();
          const db = new Date(b.startDate).getTime();
          return (isNaN(da) ? Infinity : da) - (isNaN(db) ? Infinity : db);
        });

        setEvents(allEvents);
      } catch {
        // Use curated shows as fallback
        const { getMajorTradeShows } = await import("@/lib/data/trade-events");
        setEvents(getMajorTradeShows("manufacturing", []));
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [productProfile]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Industry filter
      if (industryFilter !== "All") {
        const eventText = (event.name + " " + event.description + " " + event.industries.join(" ")).toLowerCase();
        if (!eventText.includes(industryFilter.toLowerCase())) return false;
      }

      // Region filter
      if (regionFilter !== "All Regions") {
        const regionCountries = REGION_COUNTRIES[regionFilter];
        if (regionCountries) {
          const eventCountry = event.country.toLowerCase();
          if (!regionCountries.some((c) => eventCountry.includes(c) || c.includes(eventCountry))) {
            return false;
          }
        }
      }

      // Month filter
      if (selectedMonth !== null) {
        const eventDate = new Date(event.startDate);
        if (eventDate.getMonth() !== selectedMonth) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchText = (event.name + " " + event.description + " " + event.location + " " + event.country).toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      return true;
    });
  }, [events, industryFilter, regionFilter, selectedMonth, searchQuery]);

  // Recommended events based on profile
  const recommendedEvents = useMemo(() => {
    if (!productProfile) return [];
    const category = productProfile.category?.toLowerCase() || "";
    const markets = productProfile.targetMarkets?.map((m) => m.toLowerCase()) || [];

    return events
      .filter((e) => {
        const text = (e.name + " " + e.description + " " + e.industries.join(" ")).toLowerCase();
        const country = e.country.toLowerCase();
        return (
          text.includes(category) ||
          markets.some((m) => country.includes(m) || text.includes(m))
        );
      })
      .slice(0, 4);
  }, [events, productProfile]);

  // Calendar months
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Calendar className="w-6 h-6 text-text-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-serif text-text-primary">Trade Events</h1>
          <p className="text-sm text-text-muted mt-1">
            Upcoming trade shows, missions, and export events
          </p>
        </div>

        {/* Recommended for you */}
        {recommendedEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-medium text-text-primary">Recommended for You</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recommendedEvents.map((event) => (
                <a
                  key={event.id}
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-card border-l-4 border-l-accent p-4 hover:bg-bg-tertiary/50 transition-colors group"
                >
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                    {event.name}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatEventDate(event.startDate, event.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location || event.country}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Industry filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
          >
            {INDUSTRY_FILTERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Region filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-primary text-sm text-text-secondary focus:outline-none focus:border-accent"
          >
            {REGION_FILTERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-border-primary rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list" ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:text-text-secondary",
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "calendar" ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:text-text-secondary",
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar month selector */}
        {viewMode === "calendar" && (
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedMonth(null)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
                selectedMonth === null
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-tertiary",
              )}
            >
              All
            </button>
            {months.map((m, i) => {
              const hasEvents = events.some((e) => new Date(e.startDate).getMonth() === i);
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
                  disabled={!hasEvents}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
                    selectedMonth === i
                      ? "bg-accent/10 text-accent"
                      : hasEvents
                        ? "text-text-muted hover:text-text-secondary hover:bg-bg-tertiary"
                        : "text-text-muted/30 cursor-not-allowed",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}

        {/* Events list */}
        {filteredEvents.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <Calendar className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
            <p className="text-sm text-text-secondary">No events match your filters</p>
            <p className="text-xs text-text-muted mt-1">Try broadening your search criteria</p>
          </div>
        ) : (
          <div className={cn(viewMode === "calendar" ? "grid grid-cols-2 gap-3" : "space-y-3")}>
            {filteredEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 hover:bg-bg-tertiary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{event.name}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-text-secondary">
                        <Calendar className="w-3 h-3 text-text-muted" />
                        {formatEventDate(event.startDate, event.endDate)}
                      </span>
                      {(event.location || event.country) && (
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <MapPin className="w-3 h-3 text-text-muted" />
                          {event.location || event.country}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-2 line-clamp-2">
                      {event.description.slice(0, 200)}
                      {event.description.length > 200 ? "..." : ""}
                    </p>
                    {event.industries.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {event.industries.slice(0, 3).map((ind) => (
                          <span
                            key={ind}
                            className="px-2 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-muted"
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Details
                      </a>
                      {event.registrationUrl && (
                        <a
                          href={event.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          Register
                        </a>
                      )}
                      {event.cost && (
                        <span className="text-xs text-text-muted">{event.cost}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="px-2 py-1 rounded bg-bg-tertiary text-center">
                      <p className="text-lg font-bold text-text-primary leading-none">
                        {new Date(event.startDate).getDate() || "—"}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase mt-0.5">
                        {isNaN(new Date(event.startDate).getTime())
                          ? ""
                          : months[new Date(event.startDate).getMonth()]}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-2 font-mono">
                  Source: {event.source}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Sources footer */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-bg-secondary/50 border border-border-primary">
          <Globe className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
          <div className="text-xs text-text-muted leading-relaxed">
            <p>
              Events sourced from the{" "}
              <span className="text-text-secondary">U.S. Trade and Development Agency</span>,{" "}
              <span className="text-text-secondary">International Trade Administration</span>, and
              curated major international trade shows. STEP Grant funds can be used for trade show
              attendance and trade missions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatEventDate(start: string, end?: string): string {
  try {
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return start;

    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const startStr = startDate.toLocaleDateString("en-US", opts);

    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime())) {
        if (startDate.getMonth() === endDate.getMonth()) {
          return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${endDate.getDate()}, ${endDate.getFullYear()}`;
        }
        return `${startStr} – ${endDate.toLocaleDateString("en-US", opts)}`;
      }
    }

    return startStr;
  } catch {
    return start;
  }
}
