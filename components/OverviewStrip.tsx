"use client";

import { Activity, AlertTriangle, DoorOpen, Users } from "lucide-react";
import { useEffect, useState } from "react";

type Totals = {
  attendance: number;
  capacity: number;
  occupancyPct: number;
  critical: number;
  watch: number;
  incidents: number;
};

const POLL_MS = 8000;

const HISTORY_CAP = 40;

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const coords = points
    .map((v, i) => `${(i / (points.length - 1)) * 100},${28 - ((v - min) / range) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-1 h-7 w-full" aria-hidden="true">
      <polyline points={coords} fill="none" stroke="#34d399" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function OverviewStrip() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/gates", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setTotals(json.totals);
          setUpdatedAt(json.updatedAt);
          setHistory((h) => [...h, json.totals.attendance].slice(-HISTORY_CAP));
        }
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

  const stats = [
    {
      label: "In venue now",
      value: totals ? totals.attendance.toLocaleString() : "—",
      sub: totals ? `${totals.occupancyPct}% of ${totals.capacity.toLocaleString()}` : "loading…",
      icon: Users,
      tone: "text-emerald-300",
    },
    {
      label: "Gates critical",
      value: totals ? String(totals.critical) : "—",
      sub: totals ? `${totals.watch} on watch` : "loading…",
      icon: DoorOpen,
      tone: totals && totals.critical > 0 ? "text-red-300" : "text-emerald-300",
    },
    {
      label: "Open incidents",
      value: totals ? String(totals.incidents) : "—",
      sub: "multi-source feed",
      icon: AlertTriangle,
      tone: "text-amber-300",
    },
    {
      label: "Sensor feed",
      value: "LIVE",
      sub: updatedAt ? `updated ${new Date(updatedAt).toLocaleTimeString()}` : "connecting…",
      icon: Activity,
      tone: "text-emerald-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Venue overview statistics">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-white/5 bg-black/25 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/20 hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.35)]"
          >
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {s.label}
            </div>
            <p className={`scoreboard mt-1.5 text-2xl font-bold ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.sub}</p>
            {s.label === "In venue now" && <Sparkline points={history} />}
          </div>
        );
      })}
    </div>
  );
}
