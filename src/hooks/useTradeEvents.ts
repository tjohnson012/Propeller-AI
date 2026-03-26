"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ── */

export interface TradeEventDB {
  id: string;
  external_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location: string;
  city: string;
  country: string;
  region: string;
  industries: string[];
  url: string;
  registration_url: string | null;
  source: string;
  cost: string | null;
  venue: string | null;
  organizer: string | null;
  attendee_count: string | null;
  exhibitor_count: string | null;
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradeEventFilters {
  q?: string;
  industry?: string;
  region?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  featured?: boolean;
  bookmarked?: boolean;
  sort?: "date" | "name";
  page?: number;
  limit?: number;
}

export interface FilterOptions {
  industries: string[];
  countries: string[];
  regions: string[];
  sources: string[];
}

/* ── useTradeEvents ── */

export function useTradeEvents(filters: TradeEventFilters) {
  const [events, setEvents] = useState<TradeEventDB[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchEvents = useCallback(async (f: TradeEventFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      if (f.industry) params.set("industry", f.industry);
      if (f.region) params.set("region", f.region);
      if (f.country) params.set("country", f.country);
      if (f.dateFrom) params.set("dateFrom", f.dateFrom);
      if (f.dateTo) params.set("dateTo", f.dateTo);
      if (f.source) params.set("source", f.source);
      if (f.featured) params.set("featured", "true");
      if (f.sort) params.set("sort", f.sort);
      if (f.page) params.set("page", String(f.page));
      if (f.limit) params.set("limit", String(f.limit));

      const res = await fetch(`/api/trade-events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");

      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      console.error("[useTradeEvents]", err);
      setEvents([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce search queries (300ms), but fire immediately for other filter changes
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (filters.q !== undefined) {
      debounceRef.current = setTimeout(() => fetchEvents(filters), 300);
    } else {
      fetchEvents(filters);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    filters.q,
    filters.industry,
    filters.region,
    filters.country,
    filters.dateFrom,
    filters.dateTo,
    filters.source,
    filters.featured,
    filters.sort,
    filters.page,
    filters.limit,
    fetchEvents,
  ]);

  return { events, total, totalPages, loading };
}

/* ── useTradeEventFilters ── */

export function useTradeEventFilters() {
  const [filters, setFilters] = useState<FilterOptions>({
    industries: [],
    countries: [],
    regions: [],
    sources: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/trade-events/filters");
        if (!res.ok) throw new Error("Failed to fetch filters");
        const data = await res.json();
        if (mounted) setFilters(data);
      } catch (err) {
        console.error("[useTradeEventFilters]", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return { filters, loading };
}

/* ── useBookmarks ── */

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/trade-events/bookmarks");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setBookmarks(new Set(data.bookmarks ?? []));
      } catch {
        // Not logged in or not configured — no bookmarks
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const toggleBookmark = useCallback(async (eventId: string) => {
    const isBookmarked = bookmarks.has(eventId);

    // Optimistic update
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(eventId);
      else next.add(eventId);
      return next;
    });

    try {
      const res = await fetch("/api/trade-events/bookmarks", {
        method: isBookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error("Bookmark toggle failed");
    } catch {
      // Revert on failure
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
    }
  }, [bookmarks]);

  return { bookmarks, toggleBookmark, loading };
}
