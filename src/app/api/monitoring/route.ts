/**
 * Monitoring API — CRUD for watchlist entities, alerts, and manual screening.
 *
 * GET  /api/monitoring — summary + alerts + watchlist
 * POST /api/monitoring — actions: add_entity, screen_entity, screen_all, mark_read, dismiss_alert
 */

import { NextRequest } from "next/server";
import {
  getWatchlistEntities,
  saveWatchlistEntity,
  deleteWatchlistEntity,
  updateWatchlistEntity,
  getAlerts,
  updateAlertStatus,
  markAllAlertsRead,
  getUnreadAlertCount,
} from "@/lib/supabase/persistence";
import { screenSingleEntity, runMonitoringSweep } from "@/lib/data/monitoring";

export async function GET() {
  try {
    const [entities, alerts, unreadCount] = await Promise.all([
      getWatchlistEntities(),
      getAlerts(),
      getUnreadAlertCount(),
    ]);

    return Response.json({
      watchlist: entities,
      alerts,
      unreadCount,
      summary: {
        totalWatched: entities.filter((e) => e.status === "active").length,
        lastScan: entities.reduce((latest, e) => {
          if (!e.last_screened_at) return latest;
          return !latest || e.last_screened_at > latest ? e.last_screened_at : latest;
        }, null as string | null),
        unreadAlerts: unreadCount,
        riskBreakdown: {
          clean: entities.filter((e) => {
            const r = e.last_result as Record<string, unknown> | null;
            return r && (r.matchCount === 0 || !r.matchCount);
          }).length,
          flagged: entities.filter((e) => {
            const r = e.last_result as Record<string, unknown> | null;
            return r && Number(r.matchCount) > 0;
          }).length,
          unscreened: entities.filter((e) => !e.last_screened_at).length,
        },
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch monitoring data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "add_entity": {
        const id = await saveWatchlistEntity({
          entityName: body.entityName,
          entityType: body.entityType || "buyer",
          country: body.country,
          hsCodes: body.hsCodes,
          notes: body.notes,
        });
        return Response.json({ success: true, id });
      }

      case "remove_entity": {
        await deleteWatchlistEntity(body.entityId);
        return Response.json({ success: true });
      }

      case "update_entity": {
        await updateWatchlistEntity(body.entityId, body.updates);
        return Response.json({ success: true });
      }

      case "screen_entity": {
        const result = await screenSingleEntity(body.entityId);
        return Response.json({ success: true, result });
      }

      case "screen_all": {
        const result = await runMonitoringSweep();
        return Response.json({ success: true, ...result });
      }

      case "mark_read": {
        await updateAlertStatus(body.alertId, "read");
        return Response.json({ success: true });
      }

      case "mark_all_read": {
        await markAllAlertsRead();
        return Response.json({ success: true });
      }

      case "dismiss_alert": {
        await updateAlertStatus(body.alertId, "dismissed");
        return Response.json({ success: true });
      }

      case "acknowledge_alert": {
        await updateAlertStatus(body.alertId, "acknowledged");
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 },
    );
  }
}
