// Tiny TTL cache for LLM responses. Identical requests within the TTL are
// served from memory instead of spending API quota — important on the
// Gemini free tier where per-minute request limits are small.
const MAX_ENTRIES = 200;

const store = new Map<string, { value: string; expiresAt: number }>();

export function cacheGet(key: string, now: number = Date.now()): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < now) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key: string, value: string, ttlMs: number, now: number = Date.now()): void {
  if (store.size >= MAX_ENTRIES) {
    // drop the oldest entry (Map preserves insertion order)
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: now + ttlMs });
}

export function cacheClear(): void {
  store.clear();
}
