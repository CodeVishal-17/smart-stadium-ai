"use client";

import { Languages, MapPinned, ScanLine, ShieldAlert, Users } from "lucide-react";
import { useState } from "react";
import { AssistantPanel } from "@/components/AssistantPanel";
import { CrowdPanel } from "@/components/CrowdPanel";
import { DevicesPanel } from "@/components/DevicesPanel";
import { NavigationPanel } from "@/components/NavigationPanel";
import { OpsPanel } from "@/components/OpsPanel";
import { OverviewStrip } from "@/components/OverviewStrip";
import { Tabs, type TabDef } from "@/components/Tabs";

const TABS: TabDef[] = [
  { id: "crowd", label: "Crowd Management", icon: Users },
  { id: "devices", label: "Scan Devices", icon: ScanLine },
  { id: "navigation", label: "Indoor Navigation", icon: MapPinned },
  { id: "ops", label: "Decision Support", icon: ShieldAlert },
  { id: "assistant", label: "Multilingual Assistant", icon: Languages },
];

export default function Home() {
  const [activeId, setActiveId] = useState(TABS[0].id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-emerald-950/40 to-black/20 px-6 py-8 shadow-[0_0_60px_-20px_rgba(34,197,94,0.35)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_50%_-20%,rgba(167,243,208,0.25),transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-[12%] h-64 w-16 -rotate-[24deg] bg-gradient-to-b from-emerald-200/20 via-emerald-300/5 to-transparent blur-md"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[14%] h-64 w-16 rotate-[24deg] bg-gradient-to-b from-emerald-200/15 via-emerald-300/5 to-transparent blur-md"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(167,243,208,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(167,243,208,0.6)_1px,transparent_1px)] [background-size:32px_32px]"
        />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            LIVE CONTROL ROOM
          </div>
          <h1 className="scoreboard text-3xl font-bold text-emerald-50 sm:text-4xl">
            Smart Stadium Ops
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-100/70 sm:text-base">
            GenAI-enabled venue operations: dynamic crowd advisories, indoor navigation, real-time decision
            support, and multilingual fan assistance — all grounded in live venue data.
          </p>
        </div>
      </header>

      <OverviewStrip />

      <Tabs tabs={TABS} activeId={activeId} onChange={setActiveId} />

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6">
        <section role="tabpanel" id="panel-crowd" aria-labelledby="tab-crowd" hidden={activeId !== "crowd"}>
          {activeId === "crowd" && <CrowdPanel />}
        </section>
        <section role="tabpanel" id="panel-devices" aria-labelledby="tab-devices" hidden={activeId !== "devices"}>
          {activeId === "devices" && <DevicesPanel />}
        </section>
        <section
          role="tabpanel"
          id="panel-navigation"
          aria-labelledby="tab-navigation"
          hidden={activeId !== "navigation"}
        >
          {activeId === "navigation" && <NavigationPanel />}
        </section>
        <section role="tabpanel" id="panel-ops" aria-labelledby="tab-ops" hidden={activeId !== "ops"}>
          {activeId === "ops" && <OpsPanel />}
        </section>
        <section
          role="tabpanel"
          id="panel-assistant"
          aria-labelledby="tab-assistant"
          hidden={activeId !== "assistant"}
        >
          {activeId === "assistant" && <AssistantPanel />}
        </section>
      </div>

      <footer className="mt-auto border-t border-white/5 pt-4 text-xs text-slate-500">
        Gate headcounts are driven by real scan events from registered devices (see the Scan Devices tab —
        physical turnstiles would report to the same <code className="text-emerald-400/80">POST /api/scan</code>{" "}
        endpoint). Incidents and venue FAQs remain sample data in{" "}
        <code className="text-emerald-400/80">lib/venueData.ts</code>.
      </footer>
    </main>
  );
}
