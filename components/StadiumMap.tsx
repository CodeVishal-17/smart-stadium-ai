"use client";

import type { GateProjection } from "@/lib/crowdForecast";

// Gate anchor positions around the stadium bowl (SVG viewBox 0 0 640 400).
const GATE_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  "gate-1": { x: 320, y: 38, label: "G1" },
  "gate-2": { x: 590, y: 200, label: "G2" },
  "gate-3": { x: 320, y: 362, label: "G3" },
  "gate-4": { x: 50, y: 200, label: "G4" },
  "gate-5": { x: 118, y: 78, label: "G5" },
};

const STATUS_COLOR: Record<GateProjection["status"], string> = {
  normal: "#34d399",
  watch: "#fbbf24",
  critical: "#f87171",
};

export function StadiumMap({ gates }: { gates: GateProjection[] }) {
  return (
    <figure className="rounded-xl border border-white/5 bg-black/25 p-4">
      <figcaption className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Live venue map — gate load
      </figcaption>
      <svg
        viewBox="0 0 640 400"
        role="img"
        aria-label={`Stadium map. ${gates
          .map((g) => `${g.name}: ${g.occupancyPct}% full, status ${g.status}`)
          .join(". ")}`}
        className="h-auto w-full"
      >
        {/* stands */}
        <ellipse cx="320" cy="200" rx="290" ry="170" fill="#101815" stroke="#1f2e26" strokeWidth="3" />
        <ellipse cx="320" cy="200" rx="250" ry="138" fill="none" stroke="#1c2922" strokeWidth="14" opacity="0.9" />
        <ellipse cx="320" cy="200" rx="212" ry="110" fill="none" stroke="#182420" strokeWidth="12" opacity="0.9" />

        {/* pitch */}
        <ellipse cx="320" cy="200" rx="170" ry="84" fill="#14532d" />
        <ellipse cx="320" cy="200" rx="170" ry="84" fill="url(#pitchStripes)" />
        <ellipse cx="320" cy="200" rx="60" ry="30" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
        <line x1="320" y1="116" x2="320" y2="284" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />

        <defs>
          <pattern id="pitchStripes" width="34" height="400" patternUnits="userSpaceOnUse">
            <rect width="17" height="400" fill="#166534" opacity="0.45" />
          </pattern>
        </defs>

        {/* gates */}
        {gates.map((g) => {
          const pos = GATE_POSITIONS[g.id];
          if (!pos) return null;
          const color = STATUS_COLOR[g.status];
          const r = 17 + Math.min(g.occupancyPct, 100) / 12;
          return (
            <g key={g.id}>
              {g.status === "critical" && (
                <circle cx={pos.x} cy={pos.y} r={r + 8} fill={color} opacity="0.25">
                  <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.05;0.3" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={pos.x} cy={pos.y} r={r} fill="#0b0f0d" stroke={color} strokeWidth="2.5" />
              <text
                x={pos.x}
                y={pos.y - 2}
                textAnchor="middle"
                fill={color}
                fontSize="13"
                fontWeight="700"
                fontFamily="var(--font-rajdhani), sans-serif"
              >
                {pos.label}
              </text>
              <text x={pos.x} y={pos.y + 12} textAnchor="middle" fill="#94a3b8" fontSize="10">
                {g.occupancyPct}%
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.normal }} /> Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.watch }} /> Watch
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.critical }} /> Critical
        </span>
      </div>
    </figure>
  );
}
