import { randomUUID } from "node:crypto";
import { gates } from "./venueData";

// In-memory store for registered ticket-scanner devices and the scan
// events they emit. Backed by globalThis so it survives Next.js dev-server
// HMR reloads. In production this would be Redis/Postgres so counts are
// shared across serverless instances; the API surface stays the same.

export type ScannerDevice = {
  id: string;
  name: string;
  gateId: string;
  createdAt: string;
  totalScans: number;
};

type GateTally = {
  in: number;
  out: number;
  // timestamps (ms) of recent net-entry events, used for trend estimation
  recentIn: number[];
  recentOut: number[];
};

type Store = {
  devices: Map<string, ScannerDevice>;
  tallies: Map<string, GateTally>;
};

const TREND_WINDOW_MS = 5 * 60_000;
const RECENT_CAP = 2000;

function getStore(): Store {
  const g = globalThis as typeof globalThis & { __scanStore?: Store };
  if (!g.__scanStore) {
    g.__scanStore = { devices: new Map(), tallies: new Map() };
  }
  return g.__scanStore;
}

/** Clears all devices and tallies. Intended for tests. */
export function resetStore(): void {
  const g = globalThis as typeof globalThis & { __scanStore?: Store };
  g.__scanStore = { devices: new Map(), tallies: new Map() };
}

/**
 * Registers a ticket-scanner device at a gate and returns it with a
 * generated UUID the physical hardware would use on every scan report.
 * @throws if `gateId` does not match a configured gate.
 */
export function registerDevice(name: string, gateId: string): ScannerDevice {
  if (!gates.some((g) => g.id === gateId)) {
    throw new Error(`Unknown gate: ${gateId}`);
  }
  const device: ScannerDevice = {
    id: randomUUID(),
    name,
    gateId,
    createdAt: new Date().toISOString(),
    totalScans: 0,
  };
  getStore().devices.set(device.id, device);
  return device;
}

/** Returns all registered scanner devices, oldest first. */
export function listDevices(): ScannerDevice[] {
  return [...getStore().devices.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Records `count` ticket scans from a registered device, moving its gate's
 * headcount in (+) or out (−). Enforces the gate's physical bounds: entries
 * stop at capacity and exits stop at zero.
 * @throws if the device is not registered.
 */
export function recordScan(
  deviceId: string,
  direction: "in" | "out",
  count = 1,
  now: number = Date.now()
): { device: ScannerDevice; gateId: string; currentCount: number } {
  const store = getStore();
  const device = store.devices.get(deviceId);
  if (!device) {
    throw new Error("Unknown device. Register the scanner first.");
  }

  let tally = store.tallies.get(device.gateId);
  if (!tally) {
    tally = { in: 0, out: 0, recentIn: [], recentOut: [] };
    store.tallies.set(device.gateId, tally);
  }

  const gate = gates.find((g) => g.id === device.gateId);
  if (!gate) {
    throw new Error(`Device ${device.id} references unknown gate ${device.gateId}`);
  }
  for (let i = 0; i < count; i++) {
    if (direction === "in") {
      // A physical turnstile can't admit past capacity; mirror that here.
      if (tally.in - tally.out >= gate.capacity) break;
      tally.in += 1;
      tally.recentIn.push(now);
    } else {
      if (tally.in - tally.out <= 0) break;
      tally.out += 1;
      tally.recentOut.push(now);
    }
    device.totalScans += 1;
  }

  if (tally.recentIn.length > RECENT_CAP) tally.recentIn.splice(0, tally.recentIn.length - RECENT_CAP);
  if (tally.recentOut.length > RECENT_CAP) tally.recentOut.splice(0, tally.recentOut.length - RECENT_CAP);

  return { device, gateId: device.gateId, currentCount: tally.in - tally.out };
}

/**
 * Live occupancy for one gate: current headcount (scans in − scans out)
 * and the net entry rate per minute measured over the last five minutes.
 */
export function getGateLiveCounts(gateId: string, now: number = Date.now()): {
  currentCount: number;
  trendPerMin: number;
} {
  const tally = getStore().tallies.get(gateId);
  if (!tally) return { currentCount: 0, trendPerMin: 0 };

  const cutoff = now - TREND_WINDOW_MS;
  const recentNet =
    tally.recentIn.filter((t) => t >= cutoff).length - tally.recentOut.filter((t) => t >= cutoff).length;
  const trendPerMin = Math.max(0, Math.round((recentNet / TREND_WINDOW_MS) * 60_000));

  return { currentCount: tally.in - tally.out, trendPerMin };
}
