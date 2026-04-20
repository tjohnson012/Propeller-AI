/**
 * Compliance dashboard overview — one call returns everything the Compliance
 * page renders above the chat: CSL data health, watchlist summary, and the
 * most recent alerts. Keeps the page from making three parallel requests.
 */

import { getCSLLoadStatus, loadSDNList } from "@/lib/data/ofac";
import { getAlerts, getUnreadAlertCount, getWatchlistEntities } from "@/lib/supabase/persistence";

export async function GET() {
  try {
    // Warm the CSL cache in the background so later screens are fast.
    // We don't await this — the overview should render quickly even cold.
    loadSDNList().catch(() => undefined);

    const [entities, alerts, unreadCount] = await Promise.all([
      getWatchlistEntities().catch(() => []),
      getAlerts().catch(() => []),
      getUnreadAlertCount().catch(() => 0),
    ]);

    const cslStatus = getCSLLoadStatus();

    const watched = entities.filter((e) => e.status === "active");
    const flagged = entities.filter((e) => {
      const r = e.last_result as Record<string, unknown> | null;
      return r && Number(r.matchCount) > 0;
    });
    const unscreened = entities.filter((e) => !e.last_screened_at);
    const lastScan = entities.reduce<string | null>((latest, e) => {
      if (!e.last_screened_at) return latest;
      return !latest || e.last_screened_at > latest ? e.last_screened_at : latest;
    }, null);

    return Response.json({
      csl: {
        source: cslStatus.source,
        entries: cslStatus.entries,
        loadedAt: cslStatus.loadedAt,
      },
      watchlist: {
        total: watched.length,
        flagged: flagged.length,
        unscreened: unscreened.length,
        lastScan,
      },
      alerts: {
        unread: unreadCount,
        recent: alerts.slice(0, 5).map((a) => ({
          id: a.id,
          severity: a.severity,
          title: a.title,
          description: a.description,
          createdAt: a.created_at,
          status: a.status,
          matchedList: a.matched_list,
        })),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "overview failed" },
      { status: 500 },
    );
  }
}
