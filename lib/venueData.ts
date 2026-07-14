// Mock sensor / venue data standing in for the real IoT + BIM feeds
// described in the architecture doc (CCTV counts, Wi-Fi/BLE heatmaps,
// turnstile scans, venue floor plans). In production these would be
// replaced by live feeds from the sensing plane.

export type Gate = {
  id: string;
  name: string;
  capacity: number;
  currentCount: number;
  trendPerMin: number; // people/min entering, used to project near-future load
};

// Gate configuration. currentCount/trendPerMin here are only the zero
// baseline — live values come from registered scanner devices (lib/scanStore.ts)
// feeding POST /api/scan, exactly how physical turnstiles would report.
export const gates: Gate[] = [
  { id: "gate-1", name: "Gate 1 (North)", capacity: 4000, currentCount: 0, trendPerMin: 0 },
  { id: "gate-2", name: "Gate 2 (East)", capacity: 3000, currentCount: 0, trendPerMin: 0 },
  { id: "gate-3", name: "Gate 3 (South, VIP)", capacity: 1500, currentCount: 0, trendPerMin: 0 },
  { id: "gate-4", name: "Gate 4 (West)", capacity: 3500, currentCount: 0, trendPerMin: 0 },
  { id: "gate-5", name: "Gate 5 (Concourse Overflow)", capacity: 2500, currentCount: 0, trendPerMin: 0 },
];

export type Poi = {
  id: string;
  name: string;
  category: "restroom" | "food" | "medical" | "exit" | "seating" | "info";
  zone: string;
  accessible: boolean;
  nearGate: string;
  crowdLevel: "low" | "moderate" | "high";
  keywords: string[];
};

export const pois: Poi[] = [
  { id: "poi-1", name: "Restroom A (Level 1, near Gate 1)", category: "restroom", zone: "Concourse A", accessible: true, nearGate: "gate-1", crowdLevel: "high", keywords: ["restroom", "toilet", "washroom", "bathroom", "accessible restroom"] },
  { id: "poi-2", name: "Restroom B (Level 1, near Gate 5)", category: "restroom", zone: "Concourse E", accessible: true, nearGate: "gate-5", crowdLevel: "low", keywords: ["restroom", "toilet", "washroom", "bathroom", "accessible restroom"] },
  { id: "poi-3", name: "Restroom C (Level 2, near Gate 3)", category: "restroom", zone: "Concourse C", accessible: false, nearGate: "gate-3", crowdLevel: "moderate", keywords: ["restroom", "toilet", "washroom", "bathroom"] },
  { id: "poi-4", name: "Medical Point (Concourse A)", category: "medical", zone: "Concourse A", accessible: true, nearGate: "gate-1", crowdLevel: "low", keywords: ["medical", "first aid", "doctor", "nurse", "injury", "emergency"] },
  { id: "poi-5", name: "Food Court (Concourse B)", category: "food", zone: "Concourse B", accessible: true, nearGate: "gate-2", crowdLevel: "high", keywords: ["food", "snacks", "restaurant", "eat", "drink", "water"] },
  { id: "poi-6", name: "Quiet Food Stall (Concourse E)", category: "food", zone: "Concourse E", accessible: true, nearGate: "gate-5", crowdLevel: "low", keywords: ["food", "snacks", "quiet", "eat", "drink"] },
  { id: "poi-7", name: "Emergency Exit 4 (West Stairwell)", category: "exit", zone: "Concourse D", accessible: false, nearGate: "gate-4", crowdLevel: "moderate", keywords: ["exit", "emergency exit", "evacuation", "stairs"] },
  { id: "poi-8", name: "Accessible Exit Ramp (Concourse E)", category: "exit", zone: "Concourse E", accessible: true, nearGate: "gate-5", crowdLevel: "low", keywords: ["exit", "ramp", "wheelchair", "accessible exit"] },
  { id: "poi-9", name: "Lost & Found / Info Desk (Concourse C)", category: "info", zone: "Concourse C", accessible: true, nearGate: "gate-3", crowdLevel: "moderate", keywords: ["lost and found", "information", "help desk", "tickets", "lost child"] },
  { id: "poi-10", name: "General Seating Block D", category: "seating", zone: "Concourse D", accessible: false, nearGate: "gate-4", crowdLevel: "moderate", keywords: ["seat", "seating", "block d"] },
];

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

// Ground-truth venue FAQ knowledge base used for the RAG-style
// multilingual assistant, so answers stay grounded instead of hallucinated.
export const faqs: FaqEntry[] = [
  {
    id: "faq-1",
    question: "What time do gates open?",
    answer: "Gates open 2 hours before the scheduled match start time. Re-entry is not permitted once you exit.",
    keywords: ["gate", "open", "time", "entry", "re-entry"],
  },
  {
    id: "faq-2",
    question: "Where can I find lost and found?",
    answer: "Lost & Found is at the Info Desk in Concourse C, near Gate 3. It is staffed until 1 hour after the event ends.",
    keywords: ["lost", "found", "lost and found", "info desk"],
  },
  {
    id: "faq-3",
    question: "Are outside food and drinks allowed?",
    answer: "Outside food and drinks are not permitted, except sealed water bottles under 500ml and medically necessary items.",
    keywords: ["food", "drink", "outside", "allowed", "bottle"],
  },
  {
    id: "faq-4",
    question: "What is the policy for children and infants?",
    answer: "Children above 2 years require a valid ticket. A baby-care room is available near Gate 5.",
    keywords: ["children", "kids", "infant", "baby", "child ticket"],
  },
  {
    id: "faq-5",
    question: "How do I request wheelchair assistance?",
    answer: "Request wheelchair assistance at any Info Desk or via the app's Assistance button; volunteers are dispatched within 10 minutes.",
    keywords: ["wheelchair", "assistance", "accessible", "disability", "mobility"],
  },
  {
    id: "faq-6",
    question: "What should I do in a medical emergency?",
    answer: "Alert the nearest steward or go to the Medical Point in Concourse A. For serious emergencies, call the venue emergency line displayed on all signage.",
    keywords: ["medical", "emergency", "injury", "sick", "help"],
  },
];

export type Incident = {
  id: string;
  timestamp: string;
  source: "cctv" | "medical-request" | "social-sentiment" | "weather" | "staff-report";
  zone: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
};

export const incidentFeed: Incident[] = [
  {
    id: "inc-1",
    timestamp: new Date(Date.now() - 6 * 60_000).toISOString(),
    source: "cctv",
    zone: "Gate 2 (East)",
    severity: "high",
    description: "Camera flags dense crowd bottleneck forming at Gate 2 turnstiles, flow rate dropping.",
  },
  {
    id: "inc-2",
    timestamp: new Date(Date.now() - 3 * 60_000).toISOString(),
    source: "medical-request",
    zone: "Concourse B, Section 14",
    severity: "medium",
    description: "Fan reported feeling faint near Food Court; volunteer requested medical assist.",
  },
  {
    id: "inc-3",
    timestamp: new Date(Date.now() - 1 * 60_000).toISOString(),
    source: "weather",
    zone: "Open Concourse (all gates)",
    severity: "low",
    description: "Forecast shows light rain in 40 minutes; possible surge toward covered concourses.",
  },
];
