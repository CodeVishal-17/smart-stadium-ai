const STYLES: Record<string, string> = {
  normal: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  low: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  watch: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  moderate: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  critical: "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/40",
  high: "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/40",
  medium: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
};

const DOT: Record<string, string> = {
  normal: "bg-emerald-400",
  low: "bg-emerald-400",
  watch: "bg-amber-400",
  moderate: "bg-amber-400",
  critical: "bg-red-400",
  high: "bg-red-400",
  medium: "bg-amber-400",
};

export function StatusPill({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/30";
  const dot = DOT[status] ?? "bg-slate-400";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status === "critical" || status === "high" ? "live-dot" : ""}`} aria-hidden="true" />
      {status}
    </span>
  );
}
