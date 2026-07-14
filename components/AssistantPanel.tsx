"use client";

import { Languages, Send } from "lucide-react";
import { useId, useState } from "react";
import { LoadingButton } from "./LoadingButton";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
};

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "Arabic", "Mandarin"];

const QUICK_QUESTIONS = [
  "What time do gates open?",
  "Where is lost and found?",
  "Can I bring a water bottle?",
  "How do I get wheelchair assistance?",
];

export function AssistantPanel() {
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("English");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const langId = useId();

  async function send(textOverride?: string) {
    const trimmed = (textOverride ?? message).trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const nextHistory: ChatMessage[] = [...history, { role: "user", text: trimmed }];
    setHistory(nextHistory);
    setMessage("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setHistory([...nextHistory, { role: "assistant", text: json.reply, sources: json.sources }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-inset ring-emerald-500/20">
          <Languages className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        </div>
        <p className="max-w-xl text-sm text-slate-400">
          A multilingual fan-assistance chatbot grounded in the venue&apos;s FAQ knowledge base (RAG), so
          answers stay accurate instead of hallucinated. Ask in any language — the reply is generated in your
          chosen response language.
        </p>
      </div>

      <div className="max-w-xs">
        <label htmlFor={langId} className="mb-1.5 block text-sm font-medium text-slate-300">
          Reply language
        </label>
        <select
          id={langId}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l} className="bg-slate-900">
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Quick questions">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading}
            onClick={() => send(q)}
            className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div
        className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-4"
        aria-live="polite"
        aria-label="Conversation with fan assistant"
      >
        {history.length === 0 && <p className="text-sm text-slate-600">No messages yet. Ask a question below.</p>}
        {history.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-lg px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 font-medium"
                  : "bg-white/5 text-slate-200"
              }`}
            >
              {m.text}
            </span>
            {m.sources && m.sources.length > 0 && (
              <p className="mt-1 text-xs text-slate-600">Grounded in: {m.sources.join("; ")}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          Type your question
        </label>
        <input
          id={inputId}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Where can I find lost and found?"
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <LoadingButton onClick={send} loading={loading}>
          <Send className="h-4 w-4" aria-hidden="true" />
          Send
        </LoadingButton>
      </form>
    </div>
  );
}
