import { NextRequest, NextResponse } from "next/server";

/**
 * Generates the OAuth authorization URL for a given platform.
 * Redirects the user to the platform's OAuth consent screen.
 */

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/integrations/oauth/callback`;

  switch (platform) {
    case "slack": {
      const clientId = process.env.SLACK_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { error: "SLACK_CLIENT_ID not configured in .env.local" },
          { status: 400 },
        );
      }
      const scopes = "commands,chat:write,channels:read";
      const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri + "?platform=slack")}`;
      return NextResponse.redirect(url);
    }

    case "gmail":
    case "sheets": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { error: "GOOGLE_CLIENT_ID not configured in .env.local" },
          { status: 400 },
        );
      }
      const gmailScopes = "https://www.googleapis.com/auth/gmail.modify";
      const sheetsScopes = "https://www.googleapis.com/auth/spreadsheets";
      const scope = platform === "gmail" ? gmailScopes : sheetsScopes;
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri + `?platform=${platform}`)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      return NextResponse.redirect(url);
    }

    case "quickbooks": {
      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { error: "QUICKBOOKS_CLIENT_ID not configured in .env.local" },
          { status: 400 },
        );
      }
      const scope = "com.intuit.quickbooks.accounting";
      const url = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri + "?platform=quickbooks")}&response_type=code&scope=${encodeURIComponent(scope)}&state=propeller`;
      return NextResponse.redirect(url);
    }

    default:
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }
}
