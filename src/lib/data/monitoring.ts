/**
 * Compliance Monitoring Engine
 *
 * Re-screens watchlist entities against the Consolidated Screening List,
 * compares results against previous screening, and generates alerts
 * when something changes (new match, match removed, score change).
 *
 * Used by:
 * - Daily Vercel Cron sweep (/api/cron/screen)
 * - Manual "Screen Now" button in the monitoring dashboard
 */

import { screenEntity } from "@/lib/data/ofac";
import { assessEndUseRisk } from "@/lib/data/end-use-screening";
import {
  getWatchlistEntities,
  updateWatchlistEntity,
  saveAlert,
  type SavedWatchlistEntity,
} from "@/lib/supabase/persistence";

export interface ScreeningChange {
  type: "new_match" | "match_removed" | "score_changed";
  entityName: string;
  listName?: string;
  previousScore?: number;
  newScore?: number;
  details: string;
}

export interface EntityScreenResult {
  entityId: string;
  entityName: string;
  matchCount: number;
  topMatchScore: number;
  topMatchList?: string;
  topMatchName?: string;
  riskLevel: string;
  changes: ScreeningChange[];
  isNewAlert: boolean;
}

export interface SweepResult {
  checked: number;
  alerts: number;
  duration: number;
  results: EntityScreenResult[];
}

/**
 * Screen a single watchlist entity and compare against its previous result.
 */
export async function screenWatchlistEntity(
  entity: SavedWatchlistEntity,
): Promise<EntityScreenResult> {
  const changes: ScreeningChange[] = [];

  // Run screening against CSL
  const result = await screenEntity(entity.entity_name);
  const matchCount = result.matches.length;
  const topMatch = result.matches[0];
  const topMatchScore = topMatch?.score ?? 0;
  const topMatchList = topMatch?.entry.sourceList;
  const topMatchName = topMatch?.entry.name;

  // Run end-use risk if entity has HS codes
  let riskLevel = "low";
  if (entity.hs_codes?.length && entity.country) {
    const endUse = assessEndUseRisk({
      hsCode: entity.hs_codes[0],
      product: entity.entity_name,
      destinationCountry: entity.country,
      buyerName: entity.entity_name,
    });
    riskLevel = endUse.riskLevel;
  }

  // Compare against previous result
  const prev = entity.last_result as { matchCount?: number; riskLevel?: string; topMatch?: string; topScore?: number } | null;

  if (prev) {
    const prevMatchCount = prev.matchCount ?? 0;
    const prevTopScore = prev.topScore ?? 0;

    if (matchCount > 0 && prevMatchCount === 0) {
      changes.push({
        type: "new_match",
        entityName: entity.entity_name,
        listName: topMatchList,
        newScore: Math.round(topMatchScore * 100),
        details: `New match found: "${topMatchName}" on ${topMatchList} (${Math.round(topMatchScore * 100)}% confidence)`,
      });
    } else if (matchCount === 0 && prevMatchCount > 0) {
      changes.push({
        type: "match_removed",
        entityName: entity.entity_name,
        details: `Previously flagged entity is no longer on screening lists. Previous match has been removed.`,
      });
    } else if (matchCount > 0 && Math.abs(topMatchScore * 100 - prevTopScore) > 5) {
      changes.push({
        type: "score_changed",
        entityName: entity.entity_name,
        previousScore: prevTopScore,
        newScore: Math.round(topMatchScore * 100),
        details: `Match score changed from ${prevTopScore}% to ${Math.round(topMatchScore * 100)}% on ${topMatchList}`,
      });
    }
  } else if (matchCount > 0) {
    // First-time screening with a match
    changes.push({
      type: "new_match",
      entityName: entity.entity_name,
      listName: topMatchList,
      newScore: Math.round(topMatchScore * 100),
      details: `Match found: "${topMatchName}" on ${topMatchList} (${Math.round(topMatchScore * 100)}% confidence)`,
    });
  }

  return {
    entityId: entity.id,
    entityName: entity.entity_name,
    matchCount,
    topMatchScore: Math.round(topMatchScore * 100),
    topMatchList,
    topMatchName,
    riskLevel,
    changes,
    isNewAlert: changes.length > 0,
  };
}

/**
 * Run a full monitoring sweep across all active watchlist entities.
 */
export async function runMonitoringSweep(): Promise<SweepResult> {
  const startTime = Date.now();
  const entities = await getWatchlistEntities();
  const activeEntities = entities.filter((e) => e.status === "active");

  const results: EntityScreenResult[] = [];
  let alertCount = 0;

  // Process in batches of 5 to avoid overwhelming the CSL API
  const batchSize = 5;
  for (let i = 0; i < activeEntities.length; i += batchSize) {
    const batch = activeEntities.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((entity) => screenWatchlistEntity(entity)),
    );

    for (const result of batchResults) {
      results.push(result);

      // Update the entity's last screening result
      await updateWatchlistEntity(result.entityId, {
        last_screened_at: new Date().toISOString(),
        last_result: {
          matchCount: result.matchCount,
          riskLevel: result.riskLevel,
          topMatch: result.topMatchName,
          topScore: result.topMatchScore,
        },
      });

      // Create alerts for any changes
      if (result.isNewAlert) {
        for (const change of result.changes) {
          const severity = change.type === "new_match" ? "critical"
            : change.type === "score_changed" ? "warning"
            : "info";

          await saveAlert({
            watchlistEntityId: result.entityId,
            alertType: change.type === "new_match" ? "match_found"
              : change.type === "match_removed" ? "match_removed"
              : "match_changed",
            severity,
            title: `${result.entityName} — ${change.type === "new_match" ? "New Match Found"
              : change.type === "match_removed" ? "Match Removed"
              : "Match Score Changed"}`,
            description: change.details,
            matchedList: change.listName,
          });
          alertCount++;
        }
      }
    }
  }

  return {
    checked: activeEntities.length,
    alerts: alertCount,
    duration: Date.now() - startTime,
    results,
  };
}

/**
 * Screen a single entity by ID (for "Screen Now" button).
 */
export async function screenSingleEntity(entityId: string): Promise<EntityScreenResult | null> {
  const entities = await getWatchlistEntities();
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return null;

  const result = await screenWatchlistEntity(entity);

  // Update entity
  await updateWatchlistEntity(entityId, {
    last_screened_at: new Date().toISOString(),
    last_result: {
      matchCount: result.matchCount,
      riskLevel: result.riskLevel,
      topMatch: result.topMatchName,
      topScore: result.topMatchScore,
    },
  });

  // Create alerts if needed
  if (result.isNewAlert) {
    for (const change of result.changes) {
      const severity = change.type === "new_match" ? "critical"
        : change.type === "score_changed" ? "warning" : "info";

      await saveAlert({
        watchlistEntityId: entityId,
        alertType: change.type === "new_match" ? "match_found"
          : change.type === "match_removed" ? "match_removed" : "match_changed",
        severity,
        title: `${result.entityName} — ${change.type === "new_match" ? "New Match Found"
          : change.type === "match_removed" ? "Match Removed" : "Match Score Changed"}`,
        description: change.details,
        matchedList: change.listName,
      });
    }
  }

  return result;
}
