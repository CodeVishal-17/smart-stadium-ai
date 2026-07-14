"use client";

import { Radar, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { GateProjection } from "@/lib/crowdForecast";
import { LoadingButton } from "./LoadingButton";
import { StadiumMap } from "./StadiumMap";
import { StatusPill } from "./StatusPill";

const POLL_MS = 8000;

export function CrowdPanel() {
  const [gates, setGates] = useState<GateProjection[]>([]);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live sensor feed: poll the zero-cost snapshot endpoint so gate cards
  // update continuously; the LLM advisory below stays on-demand.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/gates", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setGates(json.gates ?? []);
      } catch {
        // transient polling errors are fine to ignore; next tick retries
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function fetchAdvisory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crowd-advisory", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setGates(json.gates ?? []);
      setAdvisory(json.advisory ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-inset ring-emerald-500/20">
            <Radar className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="max-w-xl text-sm text-slate-400">
            Gate headcounts come from live ticket-scan events reported by the devices registered in the Scan
            Devices tab, projected 15 minutes ahead. The Crowd Advisory Agent turns the numbers into a
            control-room briefing, a public announcement, and recommended actions.
          </p>
        </div>
        <LoadingButton onClick={fetchAdvisory} loading={loading}>
          {advisory ? "Refresh advisory" : "Generate AI advisory"}
        </LoadingButton>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <StadiumMap gates={gates} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Gate occupancy table">
        {gates.length === 0 && (
          <p className="text-sm text-slate-600">Connecting to sensor feed…</p>
        )}
        {gates.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-white/5 bg-black/20 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.35)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-100">{g.name}</h3>
              <StatusPill status={g.status} />
            </div>
            <p className="scoreboard mt-3 text-2xl font-bold text-emerald-300">
              {g.occupancyPct}
              <span className="text-sm text-slate-500">%</span>
            </p>
            <p className="text-xs text-slate-500">
              {g.currentCount.toLocaleString()} / {g.capacity.toLocaleString()} capacity
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  g.status === "critical" ? "bg-red-400" : g.status === "watch" ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(g.occupancyPct, 100)}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Projected in 15 min: {g.projected15minPct}%
              {g.minutesToCapacity !== null && ` · ~${g.minutesToCapacity} min to full`}
            </p>
          </div>
        ))}
      </div>

      {advisory && (
        <div
          aria-live="polite"
          className="whitespace-pre-wrap rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm leading-relaxed text-emerald-50/90"
        >
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-300">
            <Radar className="h-4 w-4" aria-hidden="true" />
            AI Crowd Advisory
          </h3>
          {advisory}
        </div>
      )}
    </div>
  );
}
