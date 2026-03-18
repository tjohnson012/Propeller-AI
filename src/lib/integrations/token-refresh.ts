/**
 * Token refresh utilities.
 *
 * Google OAuth tokens expire after 1 hour — this module handles refreshing them.
 * Slack bot tokens don't expire, so we just return the stored token.
 */

import {
  type IntegrationConnection,
  getConnection,
  updateTokens,
  isTokenExpired,
  updateTokensServiceRole,
} from "./connections";

/**
 * Refresh a Google OAuth access token using the refresh token.
 */
export async function refreshGoogleToken(
  connection: IntegrationConnection,
): Promise<string | null> {
  if (!connection.refresh_token) {
    console.error("[token-refresh] No refresh token available for Google");
    return null;
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await resp.json();

  if (!data.access_token) {
    console.error("[token-refresh] Google refresh failed:", data);
    return null;
  }

  const expiresAt = new Date(
    Date.now() + (data.expires_in || 3600) * 1000,
  ).toISOString();

  // Update in DB — use service-role if we have a connection ID (cron context)
  await updateTokens(
    connection.platform,
    data.access_token,
    data.refresh_token || undefined,
    expiresAt,
  );

  return data.access_token;
}

/**
 * Refresh a Google token using service-role client (for cron jobs without user session).
 */
export async function refreshGoogleTokenServiceRole(
  connection: IntegrationConnection,
): Promise<string | null> {
  if (!connection.refresh_token) return null;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await resp.json();

  if (!data.access_token) {
    console.error("[token-refresh] Google refresh failed:", data);
    return null;
  }

  const expiresAt = new Date(
    Date.now() + (data.expires_in || 3600) * 1000,
  ).toISOString();

  await updateTokensServiceRole(
    connection.id,
    data.access_token,
    data.refresh_token || undefined,
    expiresAt,
  );

  return data.access_token;
}

/**
 * Get a valid access token for a platform, refreshing if needed.
 * For user-session context (API routes called by the frontend).
 */
export async function getValidToken(
  platform: string,
): Promise<string | null> {
  const connection = await getConnection(platform);
  if (!connection) return null;

  // Slack bot tokens don't expire
  if (platform === "slack") return connection.access_token;

  // Google tokens need refresh check
  if (
    (platform === "sheets" || platform === "gmail") &&
    isTokenExpired(connection)
  ) {
    return refreshGoogleToken(connection);
  }

  return connection.access_token;
}

/**
 * Get a valid access token for a connection (service-role context, for cron jobs).
 */
export async function getValidTokenForConnection(
  connection: IntegrationConnection,
): Promise<string | null> {
  if (connection.platform === "slack") return connection.access_token;

  if (
    (connection.platform === "sheets" || connection.platform === "gmail") &&
    isTokenExpired(connection)
  ) {
    return refreshGoogleTokenServiceRole(connection);
  }

  return connection.access_token;
}
