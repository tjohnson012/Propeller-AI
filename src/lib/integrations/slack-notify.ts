/**
 * Outbound Slack messaging.
 *
 * Sends Block Kit formatted alerts when monitoring detects screening changes.
 */

import type { IntegrationConnection } from "./connections";

interface SlackAlert {
  alertType: "match_found" | "match_changed" | "match_removed";
  severity: "critical" | "warning" | "info";
  entityName: string;
  description: string;
  matchedList?: string;
  matchedName?: string;
  matchScore?: number;
}

/**
 * Send a screening alert to the user's configured Slack channel.
 * Uses the stored bot token and channel ID from connection metadata.
 */
export async function sendSlackAlert(
  connection: IntegrationConnection,
  alert: SlackAlert,
): Promise<boolean> {
  const channelId = (connection.metadata as { channel_id?: string })
    .channel_id;
  if (!channelId) return false;

  const emoji =
    alert.severity === "critical"
      ? ":rotating_light:"
      : alert.severity === "warning"
        ? ":warning:"
        : ":information_source:";

  const statusColor =
    alert.severity === "critical"
      ? "#dc2626"
      : alert.severity === "warning"
        ? "#f59e0b"
        : "#3b82f6";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} Propeller Screening Alert`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Entity:*\n${alert.entityName}` },
        { type: "mrkdwn", text: `*Alert Type:*\n${formatAlertType(alert.alertType)}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: alert.description },
    },
  ];

  if (alert.matchedName && alert.matchedList) {
    blocks.push({
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Matched Name:*\n${alert.matchedName}` },
        { type: "mrkdwn", text: `*List:*\n${alert.matchedList}` },
      ],
    });
  }

  if (alert.matchScore) {
    blocks.push({
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Match Score:*\n${alert.matchScore}%` },
        { type: "mrkdwn", text: `*Severity:*\n${alert.severity.toUpperCase()}` },
      ],
    });
  }

  blocks.push(
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in Propeller" },
          url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/monitoring`,
          style: "primary",
        },
      ],
    },
  );

  try {
    const resp = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connection.access_token}`,
      },
      body: JSON.stringify({
        channel: channelId,
        text: `${emoji} ${alert.entityName}: ${alert.description}`,
        blocks,
        attachments: [{ color: statusColor, blocks: [] }],
      }),
    });

    const data = await resp.json();
    if (!data.ok) {
      console.error("[slack-notify] Failed to send message:", data.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[slack-notify] Error:", error);
    return false;
  }
}

/**
 * Send a test alert to verify the Slack connection.
 */
export async function sendTestAlert(
  connection: IntegrationConnection,
): Promise<boolean> {
  return sendSlackAlert(connection, {
    alertType: "match_found",
    severity: "info",
    entityName: "Test Entity",
    description:
      "This is a test alert from Propeller. Your Slack integration is working correctly!",
    matchedList: "Test List",
    matchedName: "Test Match",
    matchScore: 95,
  });
}

function formatAlertType(type: string): string {
  switch (type) {
    case "match_found":
      return "New Match Found";
    case "match_changed":
      return "Match Score Changed";
    case "match_removed":
      return "Match Removed";
    default:
      return type;
  }
}
