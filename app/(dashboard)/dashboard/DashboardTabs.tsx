"use client";

import { useState } from "react";
import LookerEmbed from "@/components/dashboard/looker-embed";

interface Props {
  lookerUrl: string;
  clientName: string;
  isAdmin: boolean;
}

type Tab = "snapshot" | "full" | "definitions";

export default function DashboardTabs({ lookerUrl, clientName, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("snapshot");
  const [iframeEverActive, setIframeEverActive] = useState(false);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === "full" && !iframeEverActive) {
      setIframeEverActive(true);
      setTimeout(() => {
        setIframeTimedOut(true);
      }, 3000);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "snapshot", label: "Snapshot" },
    { key: "full", label: "Full Dashboard" },
    { key: "definitions", label: "Definitions & Notes" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-zinc-800 px-6 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
              activeTab === tab.key
                ? "border-white text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {/* Snapshot tab */}
        {activeTab === "snapshot" && (
          <div className="p-6 max-w-4xl space-y-6">
            {/* KPI placeholder */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3">
                Key Metrics
              </p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
                <p className="text-sm text-zinc-500 italic">
                  KPI snapshot cards will appear here once configured.
                </p>
              </div>
            </div>

            {/* Context panel */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3">
                Context
              </p>
              <div className="space-y-3">
                {[
                  {
                    title: "Takeaways",
                    body: "Takeaways will be added by your IgniteIQ strategist.",
                  },
                  {
                    title: "Anomalies",
                    body: "No anomalies detected this period.",
                  },
                  {
                    title: "What we changed",
                    body: "Recent agency activity notes will appear here.",
                  },
                ].map((section) => (
                  <div
                    key={section.title}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white mb-2">
                        {section.title}
                      </p>
                      {isAdmin && (
                        <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                          Admin: Edit
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 italic">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Full Dashboard tab */}
        {activeTab === "full" && (
          <div className="h-full flex flex-col">
            {iframeTimedOut && !iframeEverActive && (
              <div className="px-6 py-3 bg-zinc-900/50 border-b border-zinc-800 text-sm text-zinc-400">
                Loading full dashboard. KPI snapshot is ready.{" "}
                <button
                  onClick={() => handleTabChange("snapshot")}
                  className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
                >
                  Back to Snapshot
                </button>
              </div>
            )}
            <div className="flex-1">
              <LookerEmbed
                url={lookerUrl}
                clientName={clientName}
                isActive={iframeEverActive}
              />
            </div>
          </div>
        )}

        {/* Definitions tab */}
        {activeTab === "definitions" && (
          <div className="p-6 max-w-2xl">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-white mb-2">
                  Metric Definitions & Methodology
                </p>
                {isAdmin && (
                  <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                    Admin: Edit
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-500 italic">
                Metric definitions and methodology notes will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
