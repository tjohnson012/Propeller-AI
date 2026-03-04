import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline/runner";
import type { PipelineInput, PipelineEvent } from "@/lib/pipeline/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, product, targetCountries, companyState } = body as PipelineInput;

    if (!product?.trim()) {
      return new Response(JSON.stringify({ error: "Product description is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: PipelineEvent) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            // Client may have disconnected
          }
        };

        try {
          await runPipeline(
            {
              companyName: companyName || "Your Company",
              product,
              targetCountries: targetCountries?.length > 0 ? targetCountries : ["Canada", "Germany", "Japan"],
              companyState,
            },
            emit,
          );
        } catch (err) {
          emit({
            type: "message",
            agentId: "market",
            text: `Pipeline error: ${err instanceof Error ? err.message : "Unknown error"}. The analysis may be incomplete.`,
          });
          emit({ type: "done" });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Pipeline API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
