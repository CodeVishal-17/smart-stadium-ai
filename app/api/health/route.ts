import { NextResponse } from "next/server";
import { generateText } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operational health check: reports whether the AI backend is reachable
// without leaking any secrets. The probe result is cached for 5 minutes
// (via generateText's cache) so polling this endpoint doesn't burn quota.
export async function GET() {
  const provider = process.env.GROQ_API_KEY ? "groq" : process.env.GEMINI_API_KEY ? "gemini" : null;

  if (!provider) {
    return NextResponse.json({
      status: "degraded",
      provider: null,
      ai: "unavailable",
      reason: "No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY.",
    });
  }

  try {
    const text = await generateText({
      system: "You are a health check. Reply with the single word OK.",
      user: "ping",
      maxOutputTokens: 5,
      cacheKey: "health-probe",
      cacheTtlMs: 5 * 60_000,
    });
    return NextResponse.json({ status: "ok", provider, ai: "available", probe: text.slice(0, 20) });
  } catch (err) {
    return NextResponse.json({
      status: "degraded",
      provider,
      ai: "unavailable",
      reason: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
