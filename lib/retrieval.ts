import { faqs, pois, type FaqEntry, type Poi } from "./venueData";

// Lightweight keyword-overlap retrieval standing in for a vector-DB RAG
// pipeline (Pinecone/Weaviate in the full architecture). Deterministic and
// dependency-free, which keeps the demo testable without a live embeddings call.
function score(text: string, keywords: string[], query: string): number {
  const q = query.toLowerCase();
  let s = 0;
  for (const kw of keywords) {
    if (q.includes(kw.toLowerCase())) s += 2;
  }
  for (const word of q.split(/\s+/).filter(Boolean)) {
    if (text.toLowerCase().includes(word)) s += 1;
  }
  return s;
}

/** Top-k FAQ entries relevant to a fan's free-text question. */
export function retrieveFaqs(query: string, topK = 3): FaqEntry[] {
  return [...faqs]
    .map((f) => ({ f, s: score(f.question + " " + f.answer, f.keywords, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .map((r) => r.f);
}

/**
 * Top-k venue points of interest matching a navigation request, optionally
 * restricted to accessible ones. When the fan's current `zone` is known,
 * options in that zone rank higher — context-aware nearest-first results.
 */
export function retrievePois(
  query: string,
  opts: { accessibleOnly?: boolean; zone?: string } = {},
  topK = 3
): Poi[] {
  return [...pois]
    .filter((p) => (opts.accessibleOnly ? p.accessible : true))
    .map((p) => {
      let s = score(p.name + " " + p.category, p.keywords, query);
      if (s > 0 && opts.zone && p.zone.toLowerCase() === opts.zone.toLowerCase()) {
        s += 3; // same-zone boost: prefer what's physically closest
      }
      return { p, s };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .map((r) => r.p);
}
