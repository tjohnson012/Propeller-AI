"use client";

import {
  Calendar,
  MapPin,
  ExternalLink,
  Bookmark,
  Users,
  Building,
} from "lucide-react";
import type { TradeEventDB } from "@/hooks/useTradeEvents";

interface TradeEventCardProps {
  event: TradeEventDB;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onViewDetail: (event: TradeEventDB) => void;
}

export default function TradeEventCard({
  event,
  isBookmarked,
  onToggleBookmark,
  onViewDetail,
}: TradeEventCardProps) {
  return (
    <div className="surface-card p-4 hover:bg-bg-tertiary/30 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <button
            onClick={() => onViewDetail(event)}
            className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors text-left"
          >
            {event.name}
          </button>

          {/* Date + Location */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <Calendar className="w-3 h-3 text-text-muted" />
              {formatEventDate(event.start_date, event.end_date)}
            </span>
            {(event.location || event.country) && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <MapPin className="w-3 h-3 text-text-muted" />
                {event.location || event.country}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-text-muted mt-2 line-clamp-2">
            {event.description.slice(0, 200)}
            {event.description.length > 200 ? "..." : ""}
          </p>

          {/* Attendance + Exhibitor counts */}
          {(event.attendee_count || event.exhibitor_count) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              {event.attendee_count && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {event.attendee_count} attendees
                </span>
              )}
              {event.exhibitor_count && (
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {event.exhibitor_count} exhibitors
                </span>
              )}
            </div>
          )}

          {/* Industry badges */}
          {event.industries.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {event.industries.slice(0, 4).map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-muted capitalize"
                >
                  {ind}
                </span>
              ))}
              {event.industries.length > 4 && (
                <span className="text-[10px] text-text-muted">
                  +{event.industries.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => onViewDetail(event)}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Details
            </button>
            {event.registration_url && (
              <a
                href={event.registration_url}
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

        {/* Right column: date badge + bookmark */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="px-2 py-1 rounded bg-bg-tertiary text-center min-w-[40px]">
            <p className="text-lg font-bold text-text-primary leading-none">
              {new Date(event.start_date + "T00:00:00").getDate() || "—"}
            </p>
            <p className="text-[10px] text-text-muted uppercase mt-0.5">
              {formatMonth(event.start_date)}
            </p>
          </div>
          <button
            onClick={() => onToggleBookmark(event.id)}
            className={`p-1 rounded transition-colors ${
              isBookmarked
                ? "text-accent"
                : "text-text-muted/40 hover:text-text-muted"
            }`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark this event"}
          >
            <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Source + verified badge */}
      <div className="flex items-center gap-2 mt-2">
        <p className="text-[10px] text-text-muted font-mono">
          Source: {event.source}
        </p>
        {event.is_verified && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-500/10 text-green-500 font-medium">
            Verified
          </span>
        )}
      </div>
    </div>
  );
}

function formatMonth(dateStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? "" : months[d.getMonth()];
}

function formatEventDate(start: string, end: string | null): string {
  try {
    const startDate = new Date(start + "T00:00:00");
    if (isNaN(startDate.getTime())) return start;
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const startStr = startDate.toLocaleDateString("en-US", opts);
    if (end) {
      const endDate = new Date(end + "T00:00:00");
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
