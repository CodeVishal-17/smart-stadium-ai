import { NextResponse } from "next/server";
import { parseJsonBody, rateLimitGuard } from "@/lib/apiHelpers";
import { ADVISORY_CACHE_TTL_MS } from "@/lib/constants";
import { projectAllGates } from "@/lib/crowdForecast";
import { generateText } from "@/lib/llm";
import { crowdAdvisorySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimitGuard(req);
  if (limited) return limited;

  const body = await parseJsonBody(req);

  const parsed = crowdAdvisorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const projections = projectAllGates();
  const critical = projections.filter((g) => g.status === "critical");
  const watch = projections.filter((g) => g.status === "watch");

  const dataSummary = projections
    .map(
      (g) =>
        `${g.name}: ${g.currentCount}/${g.capacity} (${g.occupancyPct}% full), trend +${g.trendPerMin}/min, projected in 15min: ${g.projected15minPct}%, status: ${g.status}${g.minutesToCapacity !== null ? `, ~${g.minutesToCapacity} min to full capacity` : ""}`
    )
    .join("\n");

  try {
    const advisory = await generateText({
      system:
        "You are a Crowd Advisory Agent for a stadium control room. Given live gate occupancy and 15-minute projections, write: " +
        "(1) a one-paragraph control-room briefing, (2) a short calm public announcement (max 2 sentences) suitable for PA/digital signage, and (3) a bullet list of concrete recommended actions (e.g. reroute fans, open extra scanners, deploy staff). " +
        "Only use the data provided. Be concise and avoid alarming language for the public announcement even when status is critical. " +
        "Respond in plain text only — no markdown syntax (#, *, **). Use exactly these three section headings on their own lines: BRIEFING:, ANNOUNCEMENT:, ACTIONS:, with actions as lines starting with '- '.",
      user: `Live gate data:\n${dataSummary}`,
      maxOutputTokens: 450,
      // Bucket the cache key by each gate's status so a materially changed
      // situation regenerates, but repeated clicks within a minute don't.
      cacheKey: `crowd-advisory:${projections.map((g) => g.status).join(",")}`,
      cacheTtlMs: ADVISORY_CACHE_TTL_MS,
    });

    return NextResponse.json({
      gates: projections,
      criticalCount: critical.length,
      watchCount: watch.length,
      advisory,
    });
  } catch {
    // Rules-engine fallback: the control room still gets an actionable
    // (clearly labeled, non-AI) briefing if the LLM is unavailable.
    const busiest = [...projections].sort((a, b) => b.projected15minPct - a.projected15minPct)[0];
    const quietest = [...projections].sort((a, b) => a.occupancyPct - b.occupancyPct)[0];
    const advisory = [
      "BRIEFING (rules-engine fallback — AI advisory temporarily unavailable):",
      critical.length > 0
        ? `${critical.length} gate(s) critical: ${critical.map((g) => g.name).join(", ")}. Highest projected load is ${busiest.name} at ${busiest.projected15minPct}% in 15 minutes.`
        : `No gates critical. Highest projected load is ${busiest.name} at ${busiest.projected15minPct}% in 15 minutes.`,
      "",
      "ANNOUNCEMENT:",
      `For faster entry, fans are encouraged to use ${quietest.name}, which currently has the shortest queues.`,
      "",
      "ACTIONS:",
      ...critical.map((g) => `- Reroute incoming fans from ${g.name} toward ${quietest.name} and open additional scanners.`),
      ...watch.map((g) => `- Monitor ${g.name} (${g.occupancyPct}% now, ${g.projected15minPct}% projected).`),
      "- Re-run the AI advisory in a minute for a full natural-language briefing.",
    ].join("\n");

    return NextResponse.json({
      gates: projections,
      criticalCount: critical.length,
      watchCount: watch.length,
      advisory,
      fallback: true,
    });
  }
}
