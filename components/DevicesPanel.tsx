"use client";

import { LogIn, LogOut, ScanLine, Zap } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { gates } from "@/lib/venueData";
import type { ScannerDevice } from "@/lib/scanStore";
import { LoadingButton } from "./LoadingButton";

export function DevicesPanel() {
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [name, setName] = useState("");
  const [gateId, setGateId] = useState(gates[0].id);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const nameId = useId();
  const gateSelectId = useId();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setDevices(json.devices ?? []);
    } catch {
      // transient fetch errors: next refresh retries
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function register() {
    if (name.trim().length < 2) {
      setError("Device name needs at least 2 characters.");
      return;
    }
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), gateId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to register device");
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRegistering(false);
    }
  }

  async function scan(deviceId: string, direction: "in" | "out", count = 1) {
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, direction, count }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed");
      setLastScan(
        `${count} ticket${count > 1 ? "s" : ""} scanned ${direction} — gate now at ${json.currentCount.toLocaleString()} people`
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const gateName = (id: string) => gates.find((g) => g.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-inset ring-emerald-500/20">
          <ScanLine className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        </div>
        <p className="max-w-xl text-sm text-slate-400">
          Register the ticket scanners installed at each gate. Every scan a device reports increases (or
          decreases) that gate&apos;s live headcount — this is the real data source behind the dashboard.
          Physical turnstiles would call <code className="text-emerald-400/80">POST /api/scan</code> with
          their device ID; the buttons below simulate that hardware.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          register();
        }}
        className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium text-slate-300">
            Device name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Turnstile A-1"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label htmlFor={gateSelectId} className="mb-1.5 block text-sm font-medium text-slate-300">
            Installed at gate
          </label>
          <select
            id={gateSelectId}
            value={gateId}
            onChange={(e) => setGateId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-56"
          >
            {gates.map((g) => (
              <option key={g.id} value={g.id} className="bg-slate-900">
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <LoadingButton onClick={register} loading={registering}>
          Register device
        </LoadingButton>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {lastScan && (
        <p aria-live="polite" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-300">
          {lastScan}
        </p>
      )}

      {devices.length === 0 ? (
        <p className="text-sm text-slate-600">
          No scanners registered yet. Register one above, then simulate scans to drive the live dashboard.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Registered scanner devices">
          {devices.map((d) => (
            <li key={d.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-100">{d.name}</h4>
                  <p className="text-xs text-slate-500">{gateName(d.gateId)}</p>
                </div>
                <p className="scoreboard text-lg font-bold text-emerald-300">
                  {d.totalScans.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-slate-500">scans</span>
                </p>
              </div>
              <p className="mt-1 break-all text-xs text-slate-600">ID: {d.id}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => scan(d.id, "in")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  Scan in
                </button>
                <button
                  type="button"
                  onClick={() => scan(d.id, "out")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Scan out
                </button>
                <button
                  type="button"
                  onClick={() => scan(d.id, "in", 25)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Burst +25
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
