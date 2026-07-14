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

export function retrieveFaqs(query: string, topK = 3): FaqEntry[] {
  return [...faqs]
    .map((f) => ({ f, s: score(f.question + " " + f.answer, f.keywords, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .map((r) => r.f);
}

export function retrievePois(query: string, opts: { accessibleOnly?: boolean } = {}, topK = 3): Poi[] {
  return [...pois]
    .filter((p) => (opts.accessibleOnly ? p.accessible : true))
    .map((p) => ({ p, s: score(p.name + " " + p.category, p.keywords, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .map((r) => r.p);
}
