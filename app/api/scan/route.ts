import { NextResponse } from "next/server";
import { recordScan } from "@/lib/scanStore";
import { scanSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ingestion endpoint for ticket-scanner hardware: a physical turnstile or
// handheld scanner POSTs here on every scan. Intentionally not behind the
// LLM rate limiter — gates scan many people per minute.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a valid deviceId (uuid), direction ('in'|'out'), and optional count (1-100)." },
      { status: 400 }
    );
  }

  try {
    const { deviceId, direction, count } = parsed.data;
    const result = recordScan(deviceId, direction, count);
    return NextResponse.json({
      ok: true,
      gateId: result.gateId,
      currentCount: result.currentCount,
      deviceTotalScans: result.device.totalScans,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record scan." },
      { status: 404 }
    );
  }
}
