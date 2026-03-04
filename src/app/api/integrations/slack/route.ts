import { NextRequest, NextResponse } from "next/server";
import { screenEntity } from "@/lib/data/ofac";
import { searchHSCodes, lookupHSCode } from "@/lib/data/hts";
import { getTradeFlows } from "@/lib/data/comtrade";

/**
 * Slack slash command handler.
 * Supports: /propeller screen [entity], /propeller classify [product], /propeller flows [hs-code]
 *
 * Slack sends POST with application/x-www-form-urlencoded:
 *   - command: /propeller
 *   - text: "screen Sberbank"
 *   - user_name, channel_name, team_domain, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const text = (formData.get("text") as string || "").trim();
    const userName = formData.get("user_name") as string || "user";

    if (!text) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "*Propeller AI* commands:\n• `/propeller screen [company name]` - OFAC sanctions screening\n• `/propeller classify [product]` - HS code classification\n• `/propeller flows [hs-code]` - Trade flow analysis\n• `/propeller help` - Show this message",
      });
    }

    const [command, ...args] = text.split(" ");
    const query = args.join(" ").trim();

    switch (command.toLowerCase()) {
      case "screen": {
        if (!query) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: "Usage: `/propeller screen [company name]`\nExample: `/propeller screen Gazprombank`",
          });
        }

        const result = await screenEntity(query);
        const status = result.matches.length > 0 && result.matches[0].score > 80
          ? ":warning: *FLAGGED*"
          : ":white_check_mark: *CLEAR*";

        let response = `${status} - Screening result for *${query}*\n`;
        response += `Lists checked: ${result.listsChecked.join(", ")}\n`;

        if (result.matches.length > 0 && result.matches[0].score > 80) {
          response += `\nMatches found:\n`;
          result.matches.slice(0, 3).forEach((m) => {
            response += `• ${m.entry.name} (${m.score}% match) - ${m.entry.program}\n`;
          });
        }

        response += `\n_Screened by @${userName} via Propeller AI_`;

        return NextResponse.json({
          response_type: "in_channel",
          text: response,
        });
      }

      case "classify": {
        if (!query) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: "Usage: `/propeller classify [product description]`\nExample: `/propeller classify industrial ball valves`",
          });
        }

        const results = searchHSCodes(query);
        if (results.length === 0) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: `No HS codes found for "${query}". Try a more specific product description.`,
          });
        }

        const top = results[0];
        let response = `:package: *HS Classification* for "${query}"\n\n`;
        response += `*Code:* \`${top.code}\`\n`;
        response += `*Description:* ${top.description}\n`;
        response += `*Duty Rate:* ${top.generalDutyRate}\n`;
        const fullHS = lookupHSCode(top.code);
        if (fullHS?.specialPrograms && fullHS.specialPrograms.length > 0) {
          response += `*FTA Programs:* ${fullHS.specialPrograms.join(", ")}\n`;
        }

        if (results.length > 1) {
          response += `\nOther possible codes:\n`;
          results.slice(1, 4).forEach((r) => {
            response += `• \`${r.code}\` - ${r.description} (${r.generalDutyRate})\n`;
          });
        }

        response += `\n_Classified by @${userName} via Propeller AI_`;

        return NextResponse.json({
          response_type: "in_channel",
          text: response,
        });
      }

      case "flows": {
        if (!query) {
          return NextResponse.json({
            response_type: "ephemeral",
            text: "Usage: `/propeller flows [hs-code]`\nExample: `/propeller flows 848180`",
          });
        }

        const hsCode = query.replace(".", "");
        const flows = await getTradeFlows(hsCode, "import");

        let response = `:earth_americas: *Trade Flows* for HS \`${query}\`\n\n`;
        response += `Top importing countries:\n`;
        flows.partners.slice(0, 5).forEach((p, i) => {
          const value = (p.tradeValue / 1_000_000).toFixed(0);
          response += `${i + 1}. *${p.country}* - $${value}M (${p.share.toFixed(1)}%)\n`;
        });

        response += `\n_Analyzed by @${userName} via Propeller AI_`;

        return NextResponse.json({
          response_type: "in_channel",
          text: response,
        });
      }

      case "help":
        return NextResponse.json({
          response_type: "ephemeral",
          text: "*Propeller AI* commands:\n• `/propeller screen [company]` - OFAC sanctions screening\n• `/propeller classify [product]` - HS code classification\n• `/propeller flows [hs-code]` - Trade flow analysis",
        });

      default:
        return NextResponse.json({
          response_type: "ephemeral",
          text: `Unknown command: "${command}". Try \`/propeller help\` for available commands.`,
        });
    }
  } catch (error) {
    console.error("Slack integration error:", error);
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Something went wrong processing your request. Please try again.",
    });
  }
}
