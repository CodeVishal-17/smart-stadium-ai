import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

// Lazily constructed so the app can build/start without the key present;
// routes that need it fail with a clear error instead of crashing at boot.
function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example) or your deployment's environment variables."
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Tried in order until one succeeds: model names/quotas vary by key and
// region, so a single hardcoded model is fragile for a demo deployment.
const MODEL_FALLBACKS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

export async function generateText(params: {
  system: string;
  user: string;
  maxOutputTokens?: number;
}): Promise<string> {
  const ai = getClient();
  const configured = process.env.GEMINI_MODEL;
  const models = configured
    ? [configured, ...MODEL_FALLBACKS.filter((m) => m !== configured)]
    : MODEL_FALLBACKS;

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
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
      const raw = err instanceof Error ? err.message : String(err);
      console.error(`Gemini call failed for model ${model}:`, raw);
      // Only fall through to the next model for model-availability or
      // quota problems; auth errors won't be fixed by a different model.
      const retryable =
        raw.includes("NOT_FOUND") ||
        raw.includes("not found") ||
        raw.includes("RESOURCE_EXHAUSTED") ||
        raw.includes("429");
      if (!retryable) break;
    }
  }
  throw new Error(friendlyLlmError(lastError));
}

// Translate raw provider errors (often a JSON blob) into a short,
// user-presentable message; the raw detail stays in server logs.
function friendlyLlmError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  console.error("Gemini API error:", raw);

  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes('"code":429') || raw.includes("429")) {
    return "The AI service's rate limit or free-tier quota was hit. Please wait a minute and try again.";
  }
  if (raw.includes("API key") || raw.includes("PERMISSION_DENIED") || raw.includes("UNAUTHENTICATED")) {
    return "The AI service rejected the API key. Check GEMINI_API_KEY in the deployment settings.";
  }
  if (raw.includes("not found") || raw.includes("NOT_FOUND")) {
    return "The configured AI model is unavailable. Check the GEMINI_MODEL setting.";
  }
  return "The AI service is temporarily unavailable. Please try again shortly.";
}
