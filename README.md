# Smart Stadium Ops — GenAI Control Room

[![CI](https://github.com/CodeVishal-17/smart-stadium-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeVishal-17/smart-stadium-ai/actions/workflows/ci.yml)

A working demo built for the "Smart Stadiums & Tournament Operations" challenge. It shows GenAI directly
optimizing venue operations across four tracks, each backed by a real LLM call grounded in venue data (not
hallucinated):

- **Dynamic Crowd Management** — gate headcounts are driven by real scan events: ticket-scanner devices are
  registered per gate and every scan they report (`POST /api/scan`) moves that gate's live count. The
  dashboard polls a snapshot endpoint every few seconds, counts are projected 15 minutes ahead from the
  recent scan rate, then an LLM Crowd Advisory Agent turns the numbers into a control-room briefing, a calm
  public announcement, and concrete recommended actions.
- **Smart Indoor Navigation** — a lightweight retrieval layer (RAG-lite, no vector DB needed for this scope)
  matches a fan's natural-language request against venue points of interest (restrooms, food, medical,
  exits), factoring in live crowd level and accessibility, then an LLM composes directions.
- **Real-Time Decision Support** — an Ops Copilot ingests a multi-source incident feed (CCTV, medical
  requests, weather, staff reports), ranks by severity, and drafts an SOP-aligned situation brief. A
  **what-if simulator** lets the operator pose scenarios ("If Gate 2 closes for 15 minutes…") and get a
  projected-impact analysis. Every recommendation is explicitly marked as requiring human approval — the AI
  never claims an action was taken.
- **Multi-Language Assistance** — a chatbot answers fan questions in the language of your choice, grounded in
  the venue's FAQ knowledge base via keyword retrieval, so it won't invent policies it wasn't given.

Gate headcounts are real event data: register a scanner in the **Scan Devices** tab and drive counts through
the same `POST /api/scan` endpoint physical turnstiles would use (the tab includes simulator buttons for
demos). The scan ledger lives in an in-memory store ([`lib/scanStore.ts`](lib/scanStore.ts)) — swap it for
Redis/Postgres for multi-instance production deployments. POIs, FAQs, and the incident feed remain sample
data in [`lib/venueData.ts`](lib/venueData.ts).

### Scanner API

```bash
# register a device at a gate
curl -X POST /api/devices -H "Content-Type: application/json" \
  -d '{"name": "Turnstile A-1", "gateId": "gate-1"}'

# report scans from that device (direction: "in" | "out", count optional)
curl -X POST /api/scan -H "Content-Type: application/json" \
  -d '{"deviceId": "<uuid from registration>", "direction": "in", "count": 1}'
```

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Google Gemini API (`gemini-2.5-flash-lite` by default) for all four GenAI modules
- Zod for request validation at the API boundary
- Vitest for unit tests of the non-LLM logic (retrieval, forecasting, live-feed simulation, rate limiting,
  validation)

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your real GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable          | Required | Description                                   |
| ----------------- | -------- | ---------------------------------------------- |
| `GEMINI_API_KEY`  | Yes      | Your Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey)). Never exposed to the client — only read server-side inside API routes. |
| `GEMINI_MODEL`    | No       | Defaults to `gemini-2.5-flash-lite` (best free-tier quota). |

### Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
npm test        # vitest unit tests
```

## Deploying

The app deploys as-is to [Vercel](https://vercel.com/new): import the GitHub repo, add `GEMINI_API_KEY`
(and optionally `GEMINI_MODEL`) as environment variables in the Vercel project settings, and deploy.

## Problem-statement alignment

| Challenge track | Where it lives | GenAI role |
| --- | --- | --- |
| Dynamic crowd management | Crowd Management tab, `/api/crowd-advisory`, `/api/gates` | LLM converts live scan-driven occupancy + 15-min projections into a control-room briefing, calm PA announcement, and recommended actions |
| Smart indoor navigation | Indoor Navigation tab, `/api/navigation` | Retrieval over venue POIs (crowd-aware, accessibility-aware) grounds LLM-generated turn-by-turn directions |
| Real-time decision support | Decision Support tab, `/api/ops-brief` | LLM summarizes a multi-source incident feed, ranks severity, recommends SOP-aligned actions (human-in-the-loop), and answers what-if scenarios |
| Multi-language assistance | Multilingual Assistant tab, `/api/assistant` | RAG over venue FAQs grounds replies generated in the fan's chosen language |
| Sensing plane (IoT) | Scan Devices tab, `/api/devices`, `/api/scan` | Ticket scanners register per gate and stream real scan events that drive every dashboard number |

## Design notes

- **Security**: the Gemini key is only ever read server-side (`lib/llm.ts`); API routes validate all
  input with Zod and apply a simple in-memory rate limit per client IP.
- **Cost-aware design**: the dashboard's live gate feed polls a zero-cost snapshot endpoint
  (`/api/gates`) — LLM calls only happen when an operator explicitly requests an advisory, brief, or
  answer.
- **Grounding over hallucination**: navigation and assistant responses are constructed from a retrieval step
  over `lib/venueData.ts` before the LLM call, and the prompts explicitly instruct the model not to invent
  data outside that context.
- **Human-in-the-loop**: the Ops Copilot's decision-support output is framed as recommendations requiring
  supervisor approval, never as actions already executed — matching the safety-critical nature of gate
  closures/evacuations in the source architecture.
- **Accessibility**: the tab navigation follows the WAI-ARIA Tabs pattern (roving tabindex, arrow-key
  navigation), all inputs have associated labels, and live AI output regions use `aria-live="polite"`.
