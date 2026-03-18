import { NextRequest, NextResponse } from "next/server";
import {
  getConnection,
  updateConnectionMetadata,
} from "@/lib/integrations/connections";
import { sendTestAlert } from "@/lib/integrations/slack-notify";

/**
 * GET — Fetch the user's Slack channels for the channel picker.
 */
export async function GET() {
  const connection = await getConnection("slack");
  if (!connection) {
    return NextResponse.json(
      { error: "Not connected to Slack" },
      { status: 404 },
    );
  }

  try {
    const resp = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200",
      {
        headers: { Authorization: `Bearer ${connection.access_token}` },
      },
    );
    const data = await resp.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch channels" },
        { status: 500 },
      );
    }

    const channels = (data.channels || [])
      .filter((c: { is_archived: boolean }) => !c.is_archived)
      .map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
      }));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("[slack/channels] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 },
    );
  }
}

/**
 * POST — Save selected channel or perform actions.
 * Body: { action: "select_channel", channelId, channelName }
 *    or { action: "test_alert" }
 *    or { action: "disconnect" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const connection = await getConnection("slack");
    if (!connection) {
      return NextResponse.json(
        { error: "Not connected to Slack" },
        { status: 404 },
      );
    }

    switch (action) {
      case "select_channel": {
        const { channelId, channelName } = body;
        if (!channelId || !channelName) {
          return NextResponse.json(
            { error: "channelId and channelName required" },
            { status: 400 },
          );
        }
        await updateConnectionMetadata("slack", {
          channel_id: channelId,
          channel_name: channelName,
        });
        return NextResponse.json({ success: true });
      }

      case "test_alert": {
        const sent = await sendTestAlert(connection);
        return NextResponse.json({ success: sent });
      }

      case "disconnect": {
        const { revokeConnection } = await import(
          "@/lib/integrations/connections"
        );
        await revokeConnection("slack");
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[slack/channels] Error:", error);
    return NextResponse.json(
      { error: "Request failed" },
      { status: 500 },
    );
  }
}
