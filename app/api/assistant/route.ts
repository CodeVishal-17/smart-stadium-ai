import { NextResponse } from "next/server";
import { QUERY_CACHE_TTL_MS } from "@/lib/constants";
import { generateText } from "@/lib/llm";
import { clientKeyFromRequest, isRateLimited } from "@/lib/rateLimit";
import { retrieveFaqs } from "@/lib/retrieval";
import { assistantRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(clientKeyFromRequest(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a message (1-500 characters)." }, { status: 400 });
  }

  const { message, language } = parsed.data;
  const relevantFaqs = retrieveFaqs(message);

  const groundingText =
    relevantFaqs.length > 0
      ? relevantFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
      : "No exact FAQ match found in the venue knowledge base.";

  try {
    const reply = await generateText({
      system:
        "You are a multilingual stadium fan-assistance chatbot. Answer the fan's question grounded ONLY in the venue FAQ context provided below — do not invent policies, times, or locations that aren't in the context. " +
        `Respond in ${language}, in a friendly, concise tone (2-4 sentences). If the context doesn't cover the question, say you don't have that information and suggest asking a volunteer or the Info Desk near Gate 3.`,
      user: `Venue FAQ context:\n${groundingText}\n\nFan question: "${message}"`,
      maxOutputTokens: 250,
      cacheKey: `assistant:${language}:${message.trim().toLowerCase()}`,
      cacheTtlMs: QUERY_CACHE_TTL_MS,
    });

    return NextResponse.json({ reply, sources: relevantFaqs.map((f) => f.question) });
  } catch {
    // Fallback: serve the top FAQ answer verbatim (English only) so the
    // fan still gets grounded information when the AI is unavailable.
    const reply =
      relevantFaqs.length > 0
        ? `${relevantFaqs[0].answer} (Automatic FAQ answer — the multilingual assistant is briefly unavailable.)`
        : "The assistant is briefly unavailable. Please ask a volunteer or visit the Info Desk in Concourse C, near Gate 3.";
    return NextResponse.json({ reply, sources: relevantFaqs.map((f) => f.question), fallback: true });
  }
}
