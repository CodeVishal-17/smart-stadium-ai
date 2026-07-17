# Smart Stadium Ops — GenAI Control Room

[![CI](https://github.com/CodeVishal-17/smart-stadium-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeVishal-17/smart-stadium-ai/actions/workflows/ci.yml)

## Chosen vertical

**Smart Stadiums & Tournament Operations** — a GenAI solution for stadium operations and the tournament
experience during **FIFA World Cup 2026**. It serves four personas from one control room: **fans**
(navigation, transport, multilingual help), **organizers** (crowd advisories, decision support),
**volunteers** (grounded answers they can relay), and **venue staff** (scan-device operations).

Every AI response is grounded in live venue data (not hallucinated):

- **Dynamic Crowd Management** — gate headcounts are driven by real scan events: ticket-scanner devices are
  registered per gate and every scan they report (`POST /api/scan`) moves that gate's live count. The
  dashboard polls a snapshot endpoint every few seconds, counts are projected 15 minutes ahead from the
  recent scan rate, then an LLM Crowd Advisory Agent turns the numbers into a control-room briefing, a calm
  public announcement, and concrete recommended actions.
- **Smart Indoor Navigation** — a lightweight retrieval layer (RAG-lite, no vector DB needed for this scope)
  matches a fan's natural-language request against venue points of interest (restrooms, food, medical,
  exits), making context-aware decisions from the fan's situation: their current zone ranks nearby options
  first, live crowd level steers them away from queues, and accessibility needs filter the results — then an
  LLM composes directions starting from where they stand.
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
- Provider-agnostic GenAI layer: Groq (Llama 3.3 70B) or Google Gemini behind one wrapper, with per-provider model fallback chains
- Zod for request validation at the API boundary
- Vitest for unit tests of the non-LLM logic (retrieval, forecasting, live-feed simulation, rate limiting,
  validation)

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your GROQ_API_KEY (or GEMINI_API_KEY)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable          | Required | Description                                   |
| ----------------- | -------- | ---------------------------------------------- |
| `GROQ_API_KEY`    | One of the two | Groq API key (free at [console.groq.com/keys](https://console.groq.com/keys)). Preferred when set. Never exposed to the client — only read server-side. |
| `GROQ_MODEL`      | No       | Defaults to `llama-3.3-70b-versatile`.         |
| `GEMINI_API_KEY`  | One of the two | Google Gemini key (from [Google AI Studio](https://aistudio.google.com/apikey)); used when `GROQ_API_KEY` is not set. |
| `GEMINI_MODEL`    | No       | Defaults to `gemini-2.5-flash-lite`.           |

### Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
npm test        # vitest unit tests
```

## Deploying

The app deploys as-is to [Vercel](https://vercel.com/new): import the GitHub repo, add `GROQ_API_KEY`
(or `GEMINI_API_KEY`) as an environment variable in the Vercel project settings, and deploy.

## How to demo in two minutes

1. **Scan Devices** tab → register a scanner at Gate 2 → hit **Burst +25** a few times. Every number on the
   dashboard is now driven by those scan events.
2. **Crowd Management** tab → watch the stadium map and KPI strip update live → **Generate AI advisory** for
   a control-room briefing, PA announcement, and rerouting actions computed from your scans.
3. **Decision Support** tab → type a what-if ("If Gate 2 closes for 15 minutes…") → **Generate brief**.
4. **Multilingual Assistant** tab → switch reply language to Hindi → ask "Where can I park?".

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the three-plane design (sensing → intelligence → interaction),
a request-lifecycle walkthrough, key design decisions, and the production hardening path.

## Problem-statement alignment

| Challenge track | Where it lives | GenAI role |
| --- | --- | --- |
| Dynamic crowd management | Crowd Management tab, `/api/crowd-advisory`, `/api/gates` | LLM converts live scan-driven occupancy + 15-min projections into a control-room briefing, calm PA announcement, and recommended actions |
| Smart indoor navigation | Indoor Navigation tab, `/api/navigation` | Retrieval over venue POIs (crowd-aware, accessibility-aware) grounds LLM-generated turn-by-turn directions |
| Real-time decision support | Decision Support tab, `/api/ops-brief` | LLM summarizes a multi-source incident feed, ranks severity, recommends SOP-aligned actions (human-in-the-loop), and answers what-if scenarios |
| Multi-language assistance | Multilingual Assistant tab, `/api/assistant` | RAG over venue FAQs (incl. transport & sustainability info) grounds replies generated in the fan's chosen language |
| Accessibility | Indoor Navigation tab (accessible-only routing), WAI-ARIA UI | Accessible-path prioritization for PwD/elderly fans; the whole dashboard is keyboard- and screen-reader-friendly |
| Transportation | Indoor Navigation tab (live transport status), FAQ grounding | Metro/shuttle/parking/rideshare status feeds the Ops Copilot and the fan assistant's transport answers |
| Sustainability | Decision Support tab (sustainability telemetry) | Energy, waste, and water telemetry is part of the AI ops brief, so recommendations account for sustainability targets |
| Operational intelligence / sensing plane (IoT) | Scan Devices tab, `/api/devices`, `/api/scan` | Ticket scanners register per gate and stream real scan events that drive every dashboard number |

## Assumptions

- **One venue, one matchday** is in scope; multi-venue tournament coordination would sit a layer above this
  control room and consume the same APIs.
- **Sensor data arrives as discrete events**: ticket scanners report entries/exits via `POST /api/scan`.
  Camera-based density estimation, Wi-Fi/BLE heatmaps, and city transit APIs are represented by sample data
  (`lib/venueData.ts`) with the integration points documented in [ARCHITECTURE.md](ARCHITECTURE.md).
- **Single-instance deployment** for the demo: the scan ledger, response cache, and rate limiter are
  in-memory. Each is deliberately isolated behind one module so a Redis/Postgres swap needs no API changes.
- **The AI recommends, humans decide**: prompts are written so the model never claims an action was taken;
  gate closures and evacuations are explicitly flagged for supervisor approval.
- **Free-tier AI quotas are a real constraint**, so identical requests are cached and every route degrades
  to a clearly labeled rules-engine response instead of failing.

## Design notes

- **Security**: AI provider keys are only ever read server-side (`lib/llm.ts`); API routes validate all
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
