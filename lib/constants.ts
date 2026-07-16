/** Client polling cadence for the live gate snapshot (`/api/gates`). */
export const GATE_POLL_INTERVAL_MS = 8_000;

/** How many attendance samples the KPI sparkline retains. */
export const SPARKLINE_HISTORY_CAP = 40;

/** Cache TTL for situation-level AI output (advisories, ops briefs). */
export const ADVISORY_CACHE_TTL_MS = 60_000;

/** Cache TTL for query-level AI output (navigation, assistant replies). */
export const QUERY_CACHE_TTL_MS = 5 * 60_000;
