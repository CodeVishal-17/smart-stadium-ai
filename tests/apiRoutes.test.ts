import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetStore } from "@/lib/scanStore";

// The LLM wrapper is mocked so route logic is tested without network
// calls or an API key.
vi.mock("@/lib/llm", () => ({
  generateText: vi.fn(async () => "MOCK ADVISORY TEXT"),
}));

import { POST as assistantPost } from "@/app/api/assistant/route";
import { POST as crowdPost } from "@/app/api/crowd-advisory/route";
import { GET as devicesGet, POST as devicesPost } from "@/app/api/devices/route";
import { GET as gatesGet } from "@/app/api/gates/route";
import { POST as navigationPost } from "@/app/api/navigation/route";
import { POST as scanPost } from "@/app/api/scan/route";

let ipCounter = 0;
function jsonRequest(body: unknown): Request {
  // unique client IP per request so the rate limiter never interferes
  ipCounter += 1;
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetStore();
});

describe("POST /api/devices and /api/scan", () => {
  it("registers a device and records scans that move the gate count", async () => {
    const regRes = await devicesPost(jsonRequest({ name: "Turnstile T-1", gateId: "gate-1" }));
    expect(regRes.status).toBe(201);
    const { device } = await regRes.json();

    const scanRes = await scanPost(jsonRequest({ deviceId: device.id, direction: "in", count: 10 }));
    expect(scanRes.status).toBe(200);
    const scanJson = await scanRes.json();
    expect(scanJson.currentCount).toBe(10);

    const gatesRes = await gatesGet();
    const gatesJson = await gatesRes.json();
    expect(gatesJson.totals.attendance).toBe(10);
  });

  it("rejects registration against an unknown gate", async () => {
    const res = await devicesPost(jsonRequest({ name: "Ghost", gateId: "gate-404" }));
    expect(res.status).toBe(400);
  });

  it("rejects scans from unregistered devices", async () => {
    const res = await scanPost(
      jsonRequest({ deviceId: "2f6b2a44-59a3-4a5b-9c1d-3e8f2a7b6c5d", direction: "in" })
    );
    expect(res.status).toBe(404);
  });

  it("rejects malformed scan payloads", async () => {
    const res = await scanPost(jsonRequest({ deviceId: "not-a-uuid", direction: "sideways" }));
    expect(res.status).toBe(400);
  });

  it("lists registered devices", async () => {
    await devicesPost(jsonRequest({ name: "Turnstile T-2", gateId: "gate-2" }));
    const res = await devicesGet();
    const json = await res.json();
    expect(json.devices).toHaveLength(1);
    expect(json.devices[0].name).toBe("Turnstile T-2");
  });
});

describe("LLM-backed routes (mocked model)", () => {
  it("returns an advisory with gate projections", async () => {
    const res = await crowdPost(jsonRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisory).toBe("MOCK ADVISORY TEXT");
    expect(json.gates).toHaveLength(5);
  });

  it("answers assistant queries grounded in FAQ sources", async () => {
    const res = await assistantPost(jsonRequest({ message: "Where is lost and found?", language: "English" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe("MOCK ADVISORY TEXT");
    expect(json.sources).toContain("Where can I find lost and found?");
  });

  it("rejects assistant messages that exceed the length cap", async () => {
    const res = await assistantPost(jsonRequest({ message: "x".repeat(600) }));
    expect(res.status).toBe(400);
  });

  it("returns navigation directions with matching POIs", async () => {
    const res = await navigationPost(jsonRequest({ query: "nearest restroom", accessibleOnly: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matches.length).toBeGreaterThan(0);
    expect(json.matches.every((p: { accessible: boolean }) => p.accessible)).toBe(true);
  });

  it("handles navigation queries with no POI match without calling the LLM", async () => {
    const res = await navigationPost(jsonRequest({ query: "zzzz qqqq" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matches).toHaveLength(0);
    expect(json.directions).toMatch(/couldn't find/i);
  });
});

describe("rules-engine fallbacks when the LLM is unavailable", () => {
  it("crowd advisory degrades to a labeled non-AI briefing", async () => {
    const { generateText } = await import("@/lib/llm");
    vi.mocked(generateText).mockRejectedValueOnce(new Error("quota"));
    const res = await crowdPost(jsonRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(json.advisory).toMatch(/rules-engine fallback/i);
    expect(json.gates).toHaveLength(5);
  });

  it("navigation degrades to deterministic directions from retrieval", async () => {
    const { generateText } = await import("@/lib/llm");
    vi.mocked(generateText).mockRejectedValueOnce(new Error("quota"));
    const res = await navigationPost(jsonRequest({ query: "nearest restroom" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(json.directions).toMatch(/Nearest option/);
  });

  it("assistant degrades to the top grounded FAQ answer", async () => {
    const { generateText } = await import("@/lib/llm");
    vi.mocked(generateText).mockRejectedValueOnce(new Error("quota"));
    const res = await assistantPost(jsonRequest({ message: "Where is lost and found?" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(json.reply).toMatch(/Info Desk/);
  });
});
