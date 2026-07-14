import { NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { clientKeyFromRequest, isRateLimited } from "@/lib/rateLimit";
import { retrievePois } from "@/lib/retrieval";
import { navigationRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

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

  const parsed = navigationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid question (2-300 characters)." }, { status: 400 });
  }

  const { query, accessibleOnly } = parsed.data;
  const matches = retrievePois(query, { accessibleOnly });

  if (matches.length === 0) {
    return NextResponse.json({
      matches: [],
      directions:
        "I couldn't find a matching point of interest for that request. Try mentioning what you're looking for, e.g. \"restroom\", \"food\", \"medical point\", or \"exit\".",
    });
  }

  const poiSummary = matches
    .map((p) => `${p.name} | category: ${p.category} | zone: ${p.zone} | accessible: ${p.accessible} | current crowd level: ${p.crowdLevel} | nearest gate: ${p.nearGate}`)
    .join("\n");

  try {
    const directions = await generateText({
      system:
        "You are a Smart Indoor Navigation assistant for a stadium. Using ONLY the point-of-interest data provided, recommend the single best option for the fan's request " +
        "(prefer lower crowd level and accessibility match when relevant), then give brief turn-by-turn style directions referencing the zone and nearest gate. " +
        "If multiple options are given, mention the best one first and note the alternative. Keep it under 80 words. Do not invent locations not in the data.",
      user: `Fan request: "${query}"\nAccessible-only requested: ${accessibleOnly}\n\nMatching points of interest:\n${poiSummary}`,
      maxOutputTokens: 220,
    });

    return NextResponse.json({ matches, directions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate directions." },
      { status: 500 }
    );
  }
}
