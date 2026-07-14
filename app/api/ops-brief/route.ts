import { NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { clientKeyFromRequest, isRateLimited } from "@/lib/rateLimit";
import { incidentFeed } from "@/lib/venueData";
import { opsBriefSchema } from "@/lib/validation";

export const runtime = "nodejs";

const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export async function POST(req: Request) {
  if (isRateLimited(clientKeyFromRequest(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = opsBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const incidents = [...incidentFeed].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );

  const incidentSummary = incidents
    .map(
      (i) =>
        `[${i.severity.toUpperCase()}] (${i.source}, ${i.zone}, ${new Date(i.timestamp).toLocaleTimeString()}): ${i.description}`
    )
    .join("\n");

  const { whatIf } = parsed.data;

  try {
    const brief = await generateText({
      system:
        "You are an Ops Decision Support Copilot for a stadium control room, grounded in the venue's incident-response SOPs. " +
        "Given a list of live incidents from multiple sources (CCTV, medical requests, weather, staff reports), produce: " +
        "SITUATION SUMMARY: one paragraph overview ranked by severity. RECOMMENDED ACTIONS: a bullet list of concrete, SOP-aligned next steps per incident, clearly marked as recommendations requiring human approval before execution — never state an action has been taken. " +
        (whatIf
          ? "The operator has also posed a WHAT-IF scenario. Add a final section titled WHAT-IF IMPACT: analysing the projected knock-on effects of that scenario on gates, crowd flow, and staffing, based only on the data given. "
          : "") +
        "Do not recommend gate closures or evacuations lightly; flag those explicitly as 'REQUIRES SUPERVISOR APPROVAL'.",
      user:
        `Live incident feed (already sorted by severity):\n${incidentSummary}` +
        (whatIf ? `\n\nWhat-if scenario posed by the operator: "${whatIf}"` : ""),
      maxOutputTokens: 600,
    });

    return NextResponse.json({ incidents, brief });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate ops brief." },
      { status: 500 }
    );
  }
}
