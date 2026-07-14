import { NextResponse } from "next/server";
import { projectAllGates } from "@/lib/crowdForecast";
import { incidentFeed } from "@/lib/venueData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight live snapshot for dashboard polling. No LLM call is made
// here, so it can be hit every few seconds at zero cost.
export async function GET() {
  const gates = projectAllGates();
  const attendance = gates.reduce((sum, g) => sum + g.currentCount, 0);
  const capacity = gates.reduce((sum, g) => sum + g.capacity, 0);

  return NextResponse.json({
    gates,
    totals: {
      attendance,
      capacity,
      occupancyPct: Math.round((attendance / capacity) * 1000) / 10,
      critical: gates.filter((g) => g.status === "critical").length,
      watch: gates.filter((g) => g.status === "watch").length,
      incidents: incidentFeed.length,
    },
    updatedAt: new Date().toISOString(),
  });
}
