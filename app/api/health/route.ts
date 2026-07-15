import { NextResponse } from "next/server";
import { generateText } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operational health check: reports whether the AI backend is reachable
// without leaking any secrets. The probe result is cached for 5 minutes
// (via generateText's cache) so polling this endpoint doesn't burn quota.
export async function GET() {
  const keyPresent = Boolean(process.env.GEMINI_API_KEY);

  if (!keyPresent) {
    return NextResponse.json({ status: "degraded", keyPresent, ai: "unavailable", reason: "GEMINI_API_KEY is not set." });
  }

  try {
    const text = await generateText({
      system: "You are a health check. Reply with the single word OK.",
      user: "ping",
      maxOutputTokens: 5,
      cacheKey: "health-probe",
      cacheTtlMs: 5 * 60_000,
    });
    return NextResponse.json({ status: "ok", keyPresent, ai: "available", probe: text.slice(0, 20) });
  } catch (err) {
    return NextResponse.json({
      status: "degraded",
      keyPresent,
      ai: "unavailable",
      reason: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
