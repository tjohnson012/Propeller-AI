import { NextResponse } from "next/server";
import { getUserConnections } from "@/lib/integrations/connections";

/**
 * Returns which integrations have OAuth credentials configured
 * and whether the user has an active DB connection.
 */

interface IntegrationStatus {
  id: string;
  configured: boolean;
  connected: boolean;
  metadata?: Record<string, unknown>;
}

export async function GET() {
  // Check which users have active connections in DB
  const connections = await getUserConnections();
  const connMap = new Map(connections.map((c) => [c.platform, c]));

  const statuses: IntegrationStatus[] = [
    {
      id: "slack",
      configured: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
      connected: !!connMap.get("slack"),
      metadata: connMap.get("slack")?.metadata,
    },
    {
      id: "gmail",
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      connected: !!connMap.get("gmail"),
      metadata: connMap.get("gmail")?.metadata,
    },
    {
      id: "sheets",
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      connected: !!connMap.get("sheets"),
      metadata: connMap.get("sheets")?.metadata,
    },
    {
      id: "quickbooks",
      configured: !!(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
      connected: !!connMap.get("quickbooks"),
      metadata: connMap.get("quickbooks")?.metadata,
    },
  ];

  return NextResponse.json({ integrations: statuses });
}
