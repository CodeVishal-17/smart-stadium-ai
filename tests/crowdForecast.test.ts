import { describe, expect, it } from "vitest";
import { projectAllGates, projectGate } from "@/lib/crowdForecast";
import { gates } from "@/lib/venueData";

describe("projectAllGates", () => {
  it("returns one projection per configured gate", () => {
    expect(projectAllGates().map((g) => g.id)).toEqual(gates.map((g) => g.id));
  });
});

describe("projectGate", () => {
  it("flags a gate as critical when projected occupancy is very high", () => {
    const result = projectGate({
      id: "test-gate",
      name: "Test Gate",
      capacity: 1000,
      currentCount: 900,
      trendPerMin: 20,
    });
    expect(result.projected15minPct).toBeGreaterThanOrEqual(95);
    expect(result.status).toBe("critical");
  });

  it("flags a gate as watch when projected occupancy is high but not critical", () => {
    const result = projectGate({
      id: "test-gate",
      name: "Test Gate",
      capacity: 1000,
      currentCount: 800,
      trendPerMin: 5,
    });
    expect(result.projected15minPct).toBeGreaterThanOrEqual(80);
    expect(result.projected15minPct).toBeLessThan(95);
    expect(result.status).toBe("watch");
  });

  it("flags a gate as normal for low occupancy and flat trend", () => {
    const result = projectGate({
      id: "test-gate",
      name: "Test Gate",
      capacity: 1000,
      currentCount: 100,
      trendPerMin: 1,
    });
    expect(result.status).toBe("normal");
  });

  it("returns null minutesToCapacity when trend is zero", () => {
    const result = projectGate({
      id: "test-gate",
      name: "Test Gate",
      capacity: 1000,
      currentCount: 100,
      trendPerMin: 0,
    });
    expect(result.minutesToCapacity).toBeNull();
  });
});
