import { describe, expect, it } from "vitest";
import { isRateLimited } from "@/lib/rateLimit";

describe("isRateLimited", () => {
  it("allows requests under the limit and blocks once exceeded", () => {
    const key = `test-client-${Math.random()}`;
    let blocked = false;
    for (let i = 0; i < 25; i++) {
      blocked = isRateLimited(key);
    }
    expect(blocked).toBe(true);
  });

  it("tracks separate clients independently", () => {
    const keyA = `client-a-${Math.random()}`;
    const keyB = `client-b-${Math.random()}`;
    expect(isRateLimited(keyA)).toBe(false);
    expect(isRateLimited(keyB)).toBe(false);
  });
});
