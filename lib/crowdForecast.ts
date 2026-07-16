import { getGateLiveCounts } from "./scanStore";
import { gates, type Gate } from "./venueData";

export type GateProjection = Gate & {
  occupancyPct: number;
  projected15minPct: number;
  minutesToCapacity: number | null;
  status: "normal" | "watch" | "critical";
};

/**
 * Projects a gate's occupancy 15 minutes ahead via linear extrapolation of
 * its current entry rate — a stand-in for the Prophet/LSTM forecasting
 * model in the full architecture. Flags `watch` at ≥80% projected and
 * `critical` at ≥95% projected or ≤10 minutes to capacity.
 */
export function projectGate(gate: Gate): GateProjection {
  const occupancyPct = round1((gate.currentCount / gate.capacity) * 100);
  const projectedCount = gate.currentCount + gate.trendPerMin * 15;
  const projected15minPct = round1((projectedCount / gate.capacity) * 100);

  const remaining = gate.capacity - gate.currentCount;
  const minutesToCapacity =
    gate.trendPerMin > 0 ? round1(remaining / gate.trendPerMin) : null;

  let status: GateProjection["status"] = "normal";
  if (projected15minPct >= 95 || (minutesToCapacity !== null && minutesToCapacity <= 10)) {
    status = "critical";
  } else if (projected15minPct >= 80) {
    status = "watch";
  }

  return { ...gate, occupancyPct, projected15minPct, minutesToCapacity, status };
}

/** Projections for every configured gate, fed by live scan-store counts. */
export function projectAllGates(now?: number): GateProjection[] {
  return gates.map((g) => projectGate({ ...g, ...getGateLiveCounts(g.id, now) }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
