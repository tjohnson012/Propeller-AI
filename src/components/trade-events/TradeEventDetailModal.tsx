"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  MapPin,
  ExternalLink,
  Users,
  Building,
  Bookmark,
  Download,
  Globe,
  Tag,
} from "lucide-react";
import type { TradeEventDB } from "@/hooks/useTradeEvents";

interface TradeEventDetailModalProps {
  event: TradeEventDB | null;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onClose: () => void;
}

export default function TradeEventDetailModal({
  event,
  isBookmarked,
  onToggleBookmark,
  onClose,
}: TradeEventDetailModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-bg-primary border-l border-border-primary z-50 overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-bg-primary border-b border-border-primary px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-serif text-text-primary truncate pr-4">
                {event.name}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-bg-tertiary text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Verified + Featured badges */}
              <div className="flex items-center gap-2">
                {event.is_verified && (
                  <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-500 font-medium">
                    Verified
                  </span>
                )}
                {event.is_featured && (
                  <span className="px-2 py-0.5 rounded text-xs bg-accent/10 text-accent font-medium">
                    Featured
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-xs bg-bg-tertiary text-text-muted font-mono">
                  {event.source}
                </span>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-text-primary">
                    {formatDateFull(event.start_date, event.end_date)}
                  </p>
                </div>
              </div>

              {/* Location */}
              {(event.location || event.city || event.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary">
                      {event.venue && <span className="font-medium">{event.venue}<br /></span>}
                      {event.location || `${event.city}${event.city && event.country ? ", " : ""}${event.country}`}
                    </p>
                    {event.region && (
                      <p className="text-xs text-text-muted mt-0.5">{event.region}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Attendance + Exhibitors */}
              {(event.attendee_count || event.exhibitor_count) && (
                <div className="flex items-center gap-4">
                  {event.attendee_count && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-secondary">
                        {event.attendee_count} attendees
                      </span>
                    </div>
                  )}
                  {event.exhibitor_count && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-secondary">
                        {event.exhibitor_count} exhibitors
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                  About this event
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {event.description}
                </p>
              </div>

              {/* Industries */}
              {event.industries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-3 h-3 text-text-muted" />
                    <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Industries
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {event.industries.map((ind) => (
                      <span
                        key={ind}
                        className="px-2 py-1 rounded text-xs bg-bg-tertiary text-text-secondary capitalize"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizer + Cost */}
              {(event.organizer || event.cost) && (
                <div className="grid grid-cols-2 gap-4">
                  {event.organizer && (
                    <div>
                      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                        Organizer
                      </h3>
                      <p className="text-sm text-text-secondary">{event.organizer}</p>
                    </div>
                  )}
                  {event.cost && (
                    <div>
                      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                        Cost
                      </h3>
                      <p className="text-sm text-text-secondary">{event.cost}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-border-primary">
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Website
                  </a>
                )}
                {event.registration_url && (
                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Register
                  </a>
                )}
                <button
                  onClick={() => onToggleBookmark(event.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isBookmarked
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-primary text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </button>
                <button
                  onClick={() => downloadICS(event)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-primary text-text-secondary text-sm font-medium hover:bg-bg-tertiary transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Add to Calendar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function formatDateFull(start: string, end: string | null): string {
  try {
    const s = new Date(start + "T00:00:00");
    if (isNaN(s.getTime())) return start;
    const opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    const startStr = s.toLocaleDateString("en-US", opts);
    if (end) {
      const e = new Date(end + "T00:00:00");
      if (!isNaN(e.getTime())) {
        return `${startStr} – ${e.toLocaleDateString("en-US", opts)}`;
      }
    }
    return startStr;
  } catch {
    return start;
  }
}

function downloadICS(event: TradeEventDB) {
  const start = event.start_date.replace(/-/g, "");
  const end = event.end_date ? event.end_date.replace(/-/g, "") : start;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PropellerAI//Trade Events//EN",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:${event.description.slice(0, 500).replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location || event.country}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
