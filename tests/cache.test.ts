import { beforeEach, describe, expect, it } from "vitest";
import { cacheClear, cacheGet, cacheSet } from "@/lib/cache";

beforeEach(() => {
  cacheClear();
});

describe("TTL cache", () => {
  it("returns a stored value before its TTL expires", () => {
    const now = 1_000_000;
    cacheSet("k", "value", 60_000, now);
    expect(cacheGet("k", now + 30_000)).toBe("value");
  });

  it("expires values after the TTL", () => {
    const now = 1_000_000;
    cacheSet("k", "value", 60_000, now);
    expect(cacheGet("k", now + 61_000)).toBeNull();
  });

  it("returns null for unknown keys", () => {
    expect(cacheGet("missing")).toBeNull();
  });

  it("evicts the oldest entry when full", () => {
    const now = 1_000_000;
    for (let i = 0; i < 200; i++) cacheSet(`k${i}`, "v", 60_000, now);
    cacheSet("overflow", "v", 60_000, now);
    expect(cacheGet("k0", now)).toBeNull();
    expect(cacheGet("overflow", now)).toBe("v");
  });
});
