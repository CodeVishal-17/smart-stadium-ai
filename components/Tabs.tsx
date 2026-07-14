"use client";

import type { LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

export type TabDef = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type Props = {
  tabs: TabDef[];
  activeId: string;
  onChange: (id: string) => void;
};

// Implements the WAI-ARIA "Tabs" pattern: roving tabindex + arrow-key
// navigation, so the dashboard is usable without a mouse.
export function Tabs({ tabs, activeId, onChange }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      onChange(nextTab.id);
      refs.current[nextTab.id]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label="GenAI operations modules"
      className="flex flex-wrap gap-2 rounded-xl border border-emerald-500/10 bg-black/30 p-1.5 backdrop-blur-sm"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
              selected
                ? "bg-emerald-500/15 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
