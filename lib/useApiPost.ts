"use client";

import { useCallback, useState } from "react";

/**
 * Shared client-side helper for JSON POST calls to the app's API routes.
 * Centralises the loading flag, error extraction, and JSON handling that
 * every dashboard panel needs, so panels stay declarative.
 */
export function useApiPost<TResponse>(url: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async (body: unknown): Promise<TResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Request failed");
        }
        return json as TResponse;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  return { post, loading, error, setError };
}
