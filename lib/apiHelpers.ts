import { NextResponse } from "next/server";
import { clientKeyFromRequest, isRateLimited } from "./rateLimit";

/**
 * Returns a 429 response if the caller has exceeded the request budget,
 * or null when the request may proceed. Shared by every LLM-backed route.
 */
export function rateLimitGuard(req: Request): NextResponse | null {
  if (isRateLimited(clientKeyFromRequest(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  return null;
}

/** Parses a JSON request body, treating a missing or malformed body as `{}`. */
export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
