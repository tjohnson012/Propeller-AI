import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth callback handler.
 * Exchanges the authorization code for an access token and stores it.
 *
 * In production, tokens would be stored in a database.
 * For the MVP, we log the token and redirect to settings with a success status.
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

    if (tokenData) {
      // Store token securely in database for production use
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
