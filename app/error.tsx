"use client";

import { useEffect } from "react";

/**
 * App Router error boundary: catches unexpected render/runtime errors so
 * the control room shows a recoverable message instead of a blank screen.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled dashboard error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="scoreboard text-2xl font-bold text-emerald-50">Something went wrong</h1>
      <p className="text-sm text-slate-400">
        The control room hit an unexpected error. Your live data is unaffected — try reloading this view.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2.5 text-sm font-bold text-emerald-950 transition-all hover:from-emerald-300 hover:to-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        Try again
      </button>
    </main>
  );
}
