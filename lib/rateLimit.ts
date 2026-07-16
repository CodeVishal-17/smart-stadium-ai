// Minimal in-memory fixed-window rate limiter to protect the LLM API routes
// from abuse (cost + prompt-injection spam). A single process/instance store
// is sufficient for demo scope; swap for Redis in a multi-instance deployment.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, { count: number; windowStart: number }>();

/** True if this client key has exceeded its fixed-window request budget. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

/** Client identity for rate limiting, derived from the forwarded IP chain. */
export function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
