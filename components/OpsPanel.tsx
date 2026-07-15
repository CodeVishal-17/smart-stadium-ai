"use client";

import { FlaskConical, Leaf, ShieldAlert } from "lucide-react";
import { useId, useState } from "react";
import { sustainabilityMetrics, type Incident } from "@/lib/venueData";
import { LoadingButton } from "./LoadingButton";
import { StatusPill } from "./StatusPill";

export function OpsPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [brief, setBrief] = useState<string | null>(null);
  const [whatIf, setWhatIf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const whatIfId = useId();

  async function fetchBrief() {
    setLoading(true);
    setError(null);
    try {
      const trimmed = whatIf.trim();
      const res = await fetch("/api/ops-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed ? { whatIf: trimmed } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setIncidents(json.incidents ?? []);
      setBrief(json.brief ?? null);
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
            <ShieldAlert className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="max-w-xl text-sm text-slate-400">
            The Ops Copilot ingests multi-source incident reports (CCTV, medical requests, weather, staff) and
            drafts a ranked situation brief with SOP-aligned recommendations. All actions require human
            approval.
          </p>
        </div>
        <LoadingButton onClick={fetchBrief} loading={loading}>
          {brief ? "Refresh brief" : "Generate brief"}
        </LoadingButton>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
        <label htmlFor={whatIfId} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
          <FlaskConical className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          What-if simulator (optional)
        </label>
        <input
          id={whatIfId}
          type="text"
          value={whatIf}
          onChange={(e) => setWhatIf(e.target.value)}
          maxLength={300}
          placeholder='e.g. "If Gate 2 closes for 15 minutes, what happens to Gates 1 and 3?"'
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Pose a scenario and the next brief will include a projected-impact analysis alongside the live
          incidents.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <section aria-labelledby="sustainability-heading" className="rounded-xl border border-white/5 bg-black/20 p-4">
        <h3 id="sustainability-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Sustainability telemetry
        </h3>
        <ul className="grid gap-2 sm:grid-cols-3">
          {sustainabilityMetrics.map((m) => (
            <li key={m.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">{m.label}</p>
              <p className={`scoreboard mt-1 text-xl font-bold ${m.status === "on-target" ? "text-emerald-300" : "text-amber-300"}`}>
                {m.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{m.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">
          This telemetry is included in the AI brief, so recommendations account for energy, waste, and water status.
        </p>
      </section>

      {incidents.length > 0 && (
        <ul className="space-y-2" aria-label="Live incident feed">
          {incidents.map((i) => (
            <li
              key={i.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-3.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-100">{i.zone}</p>
                <p className="text-sm text-slate-400">{i.description}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {i.source} · {new Date(i.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <StatusPill status={i.severity} />
            </li>
          ))}
        </ul>
      )}

      {brief && (
        <div
          aria-live="polite"
          className="whitespace-pre-wrap rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm leading-relaxed text-amber-50/90"
        >
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-300">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            AI Situation Brief (requires human approval)
          </h3>
          {brief}
        </div>
      )}
    </div>
  );
}
