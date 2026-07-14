import { describe, expect, it } from "vitest";
import { retrieveFaqs, retrievePois } from "@/lib/retrieval";

describe("retrieveFaqs", () => {
  it("returns the matching FAQ for a direct keyword hit", () => {
    const results = retrieveFaqs("Where is lost and found?");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("faq-2");
  });

  it("returns an empty array when nothing matches", () => {
    const results = retrieveFaqs("xyzzy plugh unrelated nonsense");
    expect(results).toEqual([]);
  });
});

describe("retrievePois", () => {
  it("finds restrooms for a restroom query", () => {
    const results = retrievePois("nearest accessible restroom");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.category === "restroom")).toBe(true);
  });

  it("filters to accessible-only POIs when requested", () => {
    const results = retrievePois("restroom", { accessibleOnly: true });
    expect(results.every((p) => p.accessible)).toBe(true);
  });

  it("respects the topK limit", () => {
    const results = retrievePois("exit", {}, 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
