import { describe, expect, it } from "vitest";
import { assistantRequestSchema, navigationRequestSchema } from "@/lib/validation";

describe("navigationRequestSchema", () => {
  it("accepts a valid query", () => {
    const result = navigationRequestSchema.safeParse({ query: "nearest restroom" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty query", () => {
    const result = navigationRequestSchema.safeParse({ query: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an overly long query", () => {
    const result = navigationRequestSchema.safeParse({ query: "a".repeat(500) });
    expect(result.success).toBe(false);
  });

  it("defaults accessibleOnly to false when omitted", () => {
    const result = navigationRequestSchema.parse({ query: "restroom" });
    expect(result.accessibleOnly).toBe(false);
  });
});

describe("assistantRequestSchema", () => {
  it("defaults language to English when omitted", () => {
    const result = assistantRequestSchema.parse({ message: "hello" });
    expect(result.language).toBe("English");
  });

  it("rejects an empty message", () => {
    const result = assistantRequestSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });
});
