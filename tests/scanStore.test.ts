import { beforeEach, describe, expect, it } from "vitest";
import {
  getGateLiveCounts,
  listDevices,
  recordScan,
  registerDevice,
  resetStore,
} from "@/lib/scanStore";
import { gates } from "@/lib/venueData";

beforeEach(() => {
  resetStore();
});

describe("registerDevice", () => {
  it("registers a device against a known gate", () => {
    const device = registerDevice("Turnstile A-1", "gate-1");
    expect(device.id).toBeTruthy();
    expect(device.gateId).toBe("gate-1");
    expect(listDevices()).toHaveLength(1);
  });

  it("rejects unknown gates", () => {
    expect(() => registerDevice("Bad", "gate-999")).toThrow(/Unknown gate/);
  });
});

describe("recordScan", () => {
  it("increments the gate count on scan-in and decrements on scan-out", () => {
    const device = registerDevice("Turnstile A-1", "gate-1");
    recordScan(device.id, "in", 3);
    expect(getGateLiveCounts("gate-1").currentCount).toBe(3);
    recordScan(device.id, "out", 1);
    expect(getGateLiveCounts("gate-1").currentCount).toBe(2);
  });

  it("never lets a gate count go below zero", () => {
    const device = registerDevice("Turnstile A-1", "gate-1");
    recordScan(device.id, "out", 5);
    expect(getGateLiveCounts("gate-1").currentCount).toBe(0);
  });

  it("never lets a gate count exceed its capacity", () => {
    const gate = gates.find((g) => g.id === "gate-3")!; // capacity 1500
    const device = registerDevice("VIP Scanner", gate.id);
    for (let i = 0; i < 20; i++) recordScan(device.id, "in", 100);
    expect(getGateLiveCounts(gate.id).currentCount).toBe(gate.capacity);
  });

  it("rejects scans from unregistered devices", () => {
    expect(() => recordScan("2f6b2a44-0000-0000-0000-000000000000", "in")).toThrow(/Unknown device/);
  });

  it("tracks per-device scan totals", () => {
    const device = registerDevice("Turnstile A-1", "gate-1");
    recordScan(device.id, "in", 4);
    expect(listDevices()[0].totalScans).toBe(4);
  });
});

describe("getGateLiveCounts", () => {
  it("returns zeros for a gate with no scans", () => {
    expect(getGateLiveCounts("gate-2")).toEqual({ currentCount: 0, trendPerMin: 0 });
  });

  it("computes a positive trend from recent scan-ins", () => {
    const device = registerDevice("Turnstile B-1", "gate-2");
    const now = Date.now();
    recordScan(device.id, "in", 50, now);
    const { trendPerMin } = getGateLiveCounts("gate-2", now);
    expect(trendPerMin).toBe(10); // 50 scans over the 5-minute window
  });

  it("ignores scans older than the trend window", () => {
    const device = registerDevice("Turnstile B-1", "gate-2");
    const now = Date.now();
    recordScan(device.id, "in", 50, now - 10 * 60_000);
    const { currentCount, trendPerMin } = getGateLiveCounts("gate-2", now);
    expect(currentCount).toBe(50);
    expect(trendPerMin).toBe(0);
  });
});
