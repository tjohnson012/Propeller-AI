/**
 * Integration connection persistence layer.
 * Stores and retrieves OAuth tokens in Supabase — no localStorage fallback.
 */

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";

export interface IntegrationConnection {
  id: string;
  user_id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_at: string | null;
  scopes: string | null;
  metadata: Record<string, unknown>;
  status: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert a connection (insert or update on conflict).
 */
export async function saveConnection(
  platform: string,
  tokenData: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_at?: string;
    scopes?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("integration_connections")
    .upsert(
      {
        user_id: user.id,
        platform,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || "Bearer",
        expires_at: tokenData.expires_at || null,
        scopes: tokenData.scopes || null,
        metadata: tokenData.metadata || {},
        status: "active",
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    )
    .select("id")
    .single();

  if (error) {
    console.error(`[connections] Failed to save ${platform} connection:`, error);
    return null;
  }
  return data.id;
}

/**
 * Get a single connection for the current user.
 */
export async function getConnection(
  platform: string,
): Promise<IntegrationConnection | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", platform)
    .eq("status", "active")
    .single();

  return data || null;
}

/**
 * Get all active connections for the current user.
 */
export async function getUserConnections(): Promise<IntegrationConnection[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  return data || [];
}

/**
 * Revoke a connection (sets status to 'revoked').
 */
export async function revokeConnection(platform: string): Promise<void> {
  const supabase = await createServerSupabase();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("integration_connections")
    .update({ status: "revoked" })
    .eq("user_id", user.id)
    .eq("platform", platform);
}

/**
 * Merge metadata into the connection's jsonb metadata field.
 */
export async function updateConnectionMetadata(
  platform: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const supabase = await createServerSupabase();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Read current metadata, merge, and write back
  const existing = await getConnection(platform);
  const merged = { ...(existing?.metadata || {}), ...metadata };

  await supabase
    .from("integration_connections")
    .update({ metadata: merged, last_used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("platform", platform);
}

/**
 * Update tokens (e.g., after a refresh).
 */
export async function updateTokens(
  platform: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: string,
): Promise<void> {
  const supabase = await createServerSupabase();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updates: Record<string, unknown> = {
    access_token: accessToken,
    last_used_at: new Date().toISOString(),
  };
  if (refreshToken) updates.refresh_token = refreshToken;
  if (expiresAt) updates.expires_at = expiresAt;

  await supabase
    .from("integration_connections")
    .update(updates)
    .eq("user_id", user.id)
    .eq("platform", platform);
}

/**
 * Check if a connection's token is expired.
 */
export function isTokenExpired(connection: IntegrationConnection): boolean {
  if (!connection.expires_at) return false;
  return new Date(connection.expires_at) <= new Date();
}

/**
 * Get all connections for a platform across all users (service-role, for cron jobs).
 */
export async function getAllConnectionsForPlatform(
  platform: string,
): Promise<IntegrationConnection[]> {
  const supabase = createServiceSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("platform", platform)
    .eq("status", "active");

  return data || [];
}

/**
 * Update tokens using service-role client (for cron/background refresh).
 */
export async function updateTokensServiceRole(
  connectionId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: string,
): Promise<void> {
  const supabase = createServiceSupabase();
  if (!supabase) return;

  const updates: Record<string, unknown> = {
    access_token: accessToken,
    last_used_at: new Date().toISOString(),
  };
  if (refreshToken) updates.refresh_token = refreshToken;
  if (expiresAt) updates.expires_at = expiresAt;

  await supabase
    .from("integration_connections")
    .update(updates)
    .eq("id", connectionId);
}

/**
 * Update metadata using service-role client (for cron/background jobs).
 */
export async function updateConnectionMetadataServiceRole(
  connectionId: string,
  currentMetadata: Record<string, unknown>,
  newMetadata: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceSupabase();
  if (!supabase) return;

  const merged = { ...currentMetadata, ...newMetadata };

  await supabase
    .from("integration_connections")
    .update({ metadata: merged, last_used_at: new Date().toISOString() })
    .eq("id", connectionId);
}
