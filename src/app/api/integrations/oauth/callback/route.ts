import { NextRequest, NextResponse } from "next/server";
import { saveConnection } from "@/lib/integrations/connections";

/**
 * OAuth callback handler.
 * Exchanges the authorization code for an access token and persists it.
 */

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/integrations/oauth/callback?platform=${platform}`;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?integration=${platform}&status=error&message=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?integration=${platform}&status=error&message=No+authorization+code`,
    );
  }

  try {
    let tokenData: Record<string, unknown> | null = null;

    switch (platform) {
      case "slack": {
        const resp = await fetch("https://slack.com/api/oauth.v2.access", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.SLACK_CLIENT_ID || "",
            client_secret: process.env.SLACK_CLIENT_SECRET || "",
            code,
            redirect_uri: redirectUri,
          }),
        });
        tokenData = await resp.json();
        break;
      }

      case "gmail":
      case "sheets": {
        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        tokenData = await resp.json();
        break;
      }

      case "quickbooks": {
        const credentials = Buffer.from(
          `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`,
        ).toString("base64");

        const resp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        tokenData = await resp.json();
        break;
      }
    }

    if (tokenData && platform) {
      if (platform === "slack") {
        // Slack returns { ok, access_token, team: { id, name }, bot_user_id, ... }
        const slackData = tokenData as Record<string, unknown>;
        if (slackData.ok && slackData.access_token) {
          const team = slackData.team as { id?: string; name?: string } | undefined;
          await saveConnection(platform, {
            access_token: slackData.access_token as string,
            token_type: "Bearer",
            metadata: {
              team_name: team?.name || "",
              team_id: team?.id || "",
              bot_user_id: (slackData.bot_user_id as string) || "",
            },
          });
        }
      } else if (platform === "gmail" || platform === "sheets") {
        // Google returns { access_token, refresh_token, expires_in, token_type, scope }
        const googleData = tokenData as Record<string, unknown>;
        if (googleData.access_token) {
          const expiresIn = (googleData.expires_in as number) || 3600;
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
          await saveConnection(platform, {
            access_token: googleData.access_token as string,
            refresh_token: (googleData.refresh_token as string) || undefined,
            token_type: (googleData.token_type as string) || "Bearer",
            expires_at: expiresAt,
            scopes: (googleData.scope as string) || undefined,
          });
        }
      } else if (platform === "quickbooks") {
        const qbData = tokenData as Record<string, unknown>;
        if (qbData.access_token) {
          const expiresIn = (qbData.expires_in as number) || 3600;
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
          await saveConnection(platform, {
            access_token: qbData.access_token as string,
            refresh_token: (qbData.refresh_token as string) || undefined,
            token_type: (qbData.token_type as string) || "Bearer",
            expires_at: expiresAt,
          });
        }
      }
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?integration=${platform}&status=success`,
    );
  } catch (err) {
    console.error(`[OAuth] ${platform} token exchange failed:`, err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?integration=${platform}&status=error&message=Token+exchange+failed`,
    );
  }
}
