import { NextResponse } from "next/server";

/**
 * Returns which integrations have OAuth credentials configured.
 * The client uses this to know whether to show "Connect" or "Set up credentials".
 */

interface IntegrationStatus {
  id: string;
  configured: boolean;
  connected: boolean;
}

export async function GET() {
  const statuses: IntegrationStatus[] = [
    {
      id: "slack",
      configured: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
      connected: !!process.env.SLACK_ACCESS_TOKEN,
    },
    {
      id: "gmail",
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      connected: !!process.env.GOOGLE_ACCESS_TOKEN,
    },
    {
      id: "sheets",
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      connected: !!process.env.GOOGLE_ACCESS_TOKEN,
    },
    {
      id: "quickbooks",
      configured: !!(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
      connected: !!process.env.QUICKBOOKS_ACCESS_TOKEN,
    },
  ];

  return NextResponse.json({ integrations: statuses });
}
