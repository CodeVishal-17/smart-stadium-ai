import { NextResponse } from "next/server";
import { parseJsonBody, rateLimitGuard } from "@/lib/apiHelpers";
import { ADVISORY_CACHE_TTL_MS } from "@/lib/constants";
import { generateText } from "@/lib/llm";
import { incidentFeed, sustainabilityMetrics, transitOptions } from "@/lib/venueData";
import { opsBriefSchema } from "@/lib/validation";

export const runtime = "nodejs";

const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export async function POST(req: Request) {
  const limited = rateLimitGuard(req);
  if (limited) return limited;

  const body = await parseJsonBody(req);

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

  const transitSummary = transitOptions
    .map((t) => `${t.name} [${t.mode}]: ${t.status}, crowd ${t.crowdLevel} — ${t.detail}`)
    .join("\n");
  const sustainabilitySummary = sustainabilityMetrics
    .map((m) => `${m.label}: ${m.value} (${m.status}) — ${m.note}`)
    .join("\n");

  try {
    const brief = await generateText({
      system:
        "You are an Ops Decision Support Copilot for a stadium control room during FIFA World Cup 2026, grounded in the venue's incident-response SOPs. " +
        "Given live incidents (CCTV, medical requests, weather, staff reports) plus matchday transport and sustainability telemetry, produce: " +
        "SITUATION SUMMARY: one paragraph overview ranked by severity, noting any transport or sustainability item that needs attention. " +
        "RECOMMENDED ACTIONS: a bullet list of concrete, SOP-aligned next steps, clearly marked as recommendations requiring human approval before execution — never state an action has been taken. " +
        (whatIf
          ? "The operator has also posed a WHAT-IF scenario. Add a final section titled WHAT-IF IMPACT: analysing the projected knock-on effects of that scenario on gates, crowd flow, transport, and staffing, based only on the data given. "
          : "") +
        "Do not recommend gate closures or evacuations lightly; flag those explicitly as 'REQUIRES SUPERVISOR APPROVAL'. " +
        "Respond in plain text only — no markdown syntax (#, *, **). Put each section heading on its own line and start action items with '- '.",
      user:
        `Live incident feed (already sorted by severity):\n${incidentSummary}` +
        `\n\nTransport status:\n${transitSummary}` +
        `\n\nSustainability telemetry:\n${sustainabilitySummary}` +
        (whatIf ? `\n\nWhat-if scenario posed by the operator: "${whatIf}"` : ""),
      maxOutputTokens: 600,
      cacheKey: `ops-brief:${whatIf?.trim().toLowerCase() ?? ""}`,
      cacheTtlMs: ADVISORY_CACHE_TTL_MS,
    });

    return NextResponse.json({ incidents, brief });
  } catch {
    // Fallback: severity-ordered template brief so the control room always
    // gets something actionable, clearly labeled as non-AI.
    const brief = [
      "SITUATION SUMMARY (rules-engine fallback — AI copilot temporarily unavailable):",
      `${incidents.length} open incident(s), highest severity: ${incidents[0]?.severity ?? "none"}.`,
      "",
      "RECOMMENDED ACTIONS (require human approval):",
      ...incidents.map((i) => `- [${i.severity.toUpperCase()}] ${i.zone}: dispatch nearest staff per SOP for ${i.source} reports.`),
      whatIf ? `\nWHAT-IF IMPACT: unavailable in fallback mode — re-run in a minute for AI analysis of "${whatIf}".` : "",
    ].join("\n");
    return NextResponse.json({ incidents, brief, fallback: true });
  }
}
