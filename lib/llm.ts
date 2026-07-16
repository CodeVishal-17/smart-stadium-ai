import { GoogleGenAI } from "@google/genai";
import { cacheGet, cacheSet } from "./cache";

// Provider-agnostic LLM access. Groq (OpenAI-compatible, generous free
// tier) is preferred when GROQ_API_KEY is set; Google Gemini is used when
// only GEMINI_API_KEY is present. Each provider walks a model fallback
// chain so a missing or quota-limited model degrades to the next one.

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

let geminiClient: GoogleGenAI | null = null;

type GenerateParams = {
  system: string;
  user: string;
  maxOutputTokens?: number;
  /** When set, identical requests within cacheTtlMs are served from memory instead of spending quota. */
  cacheKey?: string;
  cacheTtlMs?: number;
};

/**
 * Single entry point for all AI text generation. Serves repeated requests
 * from a TTL cache when `cacheKey` is set, picks the configured provider,
 * and walks its model fallback chain when a model is missing or
 * quota-limited.
 * @throws a user-presentable Error when every model fails.
 */
export async function generateText(params: GenerateParams): Promise<string> {
  if (params.cacheKey) {
    const cached = cacheGet(params.cacheKey);
    if (cached) return cached;
  }

  const text = process.env.GROQ_API_KEY ? await generateViaGroq(params) : await generateViaGemini(params);

  if (params.cacheKey && text) {
    cacheSet(params.cacheKey, text, params.cacheTtlMs ?? 60_000);
  }
  return text;
}

function modelChain(configured: string | undefined, defaults: string[]): string[] {
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

async function generateViaGroq(params: GenerateParams): Promise<string> {
  const models = modelChain(process.env.GROQ_MODEL, GROQ_MODELS);

  let lastError: unknown;
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          max_tokens: params.maxOutputTokens ?? 500,
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`);
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return json.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) break;
      console.error(`Groq call failed for model ${model}:`, err instanceof Error ? err.message : err);
    }
  }
  throw new Error(friendlyLlmError(lastError));
}

async function generateViaGemini(params: GenerateParams): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "No AI provider is configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env.local (see .env.example) or your deployment's environment variables."
    );
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  const models = modelChain(process.env.GEMINI_MODEL, GEMINI_MODELS);

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await geminiClient.models.generateContent({
        model,
        contents: params.user,
        config: {
          systemInstruction: params.system,
          maxOutputTokens: params.maxOutputTokens ?? 500,
          temperature: 0.4,
        },
      });
      return response.text?.trim() ?? "";
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) break;
      console.error(`Gemini call failed for model ${model}:`, err instanceof Error ? err.message : err);
    }
  }
  throw new Error(friendlyLlmError(lastError));
}

// Only model-availability and quota problems are worth retrying on a
// different model; auth errors won't be fixed by switching.
function isRetryable(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return (
    raw.includes("NOT_FOUND") ||
    raw.includes("not found") ||
    raw.includes("does not exist") ||
    raw.includes("RESOURCE_EXHAUSTED") ||
    raw.includes("rate_limit") ||
    raw.includes("429") ||
    raw.includes("503")
  );
}

// Translate raw provider errors (often a JSON blob) into a short,
// user-presentable message; the raw detail stays in server logs.
function friendlyLlmError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  console.error("AI provider error:", raw);

  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("rate_limit") || raw.includes("429")) {
    return "The AI service's rate limit or free-tier quota was hit. Please wait a minute and try again.";
  }
  if (
    raw.includes("API key") ||
    raw.includes("PERMISSION_DENIED") ||
    raw.includes("UNAUTHENTICATED") ||
    raw.includes("401") ||
    raw.includes("403")
  ) {
    return "The AI service rejected the API key. Check GROQ_API_KEY / GEMINI_API_KEY in the deployment settings.";
  }
  if (raw.includes("not found") || raw.includes("NOT_FOUND") || raw.includes("does not exist")) {
    return "The configured AI model is unavailable. Check the GROQ_MODEL / GEMINI_MODEL setting.";
  }
  return "The AI service is temporarily unavailable. Please try again shortly.";
}
