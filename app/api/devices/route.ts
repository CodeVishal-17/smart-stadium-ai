import { NextResponse } from "next/server";
import { parseJsonBody, rateLimitGuard } from "@/lib/apiHelpers";
import { listDevices, registerDevice } from "@/lib/scanStore";
import { registerDeviceSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ devices: listDevices() });
}

export async function POST(req: Request) {
  const limited = rateLimitGuard(req);
  if (limited) return limited;

  const body = await parseJsonBody(req);

  const parsed = registerDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a device name (2-40 characters) and a gateId." },
      { status: 400 }
    );
  }

  try {
    const device = registerDevice(parsed.data.name, parsed.data.gateId);
    return NextResponse.json({ device }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to register device." },
      { status: 400 }
    );
  }
}
