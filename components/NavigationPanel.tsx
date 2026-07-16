"use client";

import { Accessibility, Bus, MapPinned, Navigation } from "lucide-react";
import { useId, useState } from "react";
import { useApiPost } from "@/lib/useApiPost";
import { transitOptions, type Poi } from "@/lib/venueData";
import { LoadingButton } from "./LoadingButton";
import { StatusPill } from "./StatusPill";

type NavigationResponse = { matches: Poi[]; directions: string };

export function NavigationPanel() {
  const [query, setQuery] = useState("Find the nearest accessible restroom that isn't crowded");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [matches, setMatches] = useState<Poi[]>([]);
  const [directions, setDirections] = useState<string | null>(null);
  const { post, loading, error, setError } = useApiPost<NavigationResponse>("/api/navigation");
  const inputId = useId();
  const checkboxId = useId();

  async function submit() {
    if (query.trim().length < 2) {
      setError("Please enter at least 2 characters.");
      return;
    }
    const result = await post({ query, accessibleOnly });
    if (result) {
      setMatches(result.matches ?? []);
      setDirections(result.directions ?? null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-inset ring-emerald-500/20">
          <MapPinned className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        </div>
        <p className="max-w-xl text-sm text-slate-400">
          Ask a natural-language question and the Indoor Navigation assistant retrieves matching points of
          interest from the venue map (RAG-lite over POI data) and generates directions that account for live
          crowd levels.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-300">
            What are you looking for?
          </label>
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            placeholder="e.g. nearest food stall that isn't crowded"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={accessibleOnly}
            onChange={(e) => setAccessibleOnly(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/30 accent-emerald-500"
          />
          <label htmlFor={checkboxId} className="flex items-center gap-1.5 text-sm text-slate-300">
            <Accessibility className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Accessible routes only
          </label>
        </div>

        <LoadingButton onClick={submit} loading={loading}>
          Get directions
        </LoadingButton>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {directions && (
        <div
          aria-live="polite"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm leading-relaxed text-emerald-50/90"
        >
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-300">
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Directions
          </h3>
          <p>{directions}</p>
        </div>
      )}

      <section aria-labelledby="transit-heading" className="rounded-xl border border-white/5 bg-black/20 p-4">
        <h3 id="transit-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Bus className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Getting here &amp; away — live transport status
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {transitOptions.map((t) => (
            <li key={t.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">{t.name}</p>
                <StatusPill status={t.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{t.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">
          Ask the Multilingual Assistant for personalised transport help — it&apos;s grounded in this same data.
        </p>
      </section>

      {matches.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Matching points of interest">
          {matches.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-white/5 bg-black/20 p-4 transition-colors hover:border-emerald-500/20"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-100">{p.name}</h4>
                <StatusPill status={p.crowdLevel} />
              </div>
              <p className="mt-1 text-xs text-slate-500">Zone: {p.zone}</p>
              <p className="text-xs text-slate-500">Accessible: {p.accessible ? "Yes" : "No"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
