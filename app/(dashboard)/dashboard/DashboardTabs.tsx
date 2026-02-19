"use client";

import { useState } from "react";
import LookerEmbed from "@/components/dashboard/looker-embed";
import AnalyticsKpiStrip from "@/components/analytics/AnalyticsKpiStrip";
import RefreshAnalyticsButton from "@/components/home/RefreshAnalyticsButton";
import type { AnalyticsData, SnapshotInsights } from "@/app/actions/analytics";

interface Props {
  lookerUrl: string | null;
  clientName: string;
  isAdmin: boolean;
  analyticsData: AnalyticsData;
  snapshotInsights: SnapshotInsights | null;
  snapshotUpdatedAt: string | null;
  clientId: string;
}

type Tab = "snapshot" | "full" | "definitions";

function SnapshotSection({
  title,
  content,
  isEmpty,
}: {
  title: string;
  content: string;
  isEmpty: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-2">{title}</p>
      <p className={`text-sm leading-relaxed ${isEmpty ? "text-zinc-500 italic" : "text-zinc-300"}`}>
        {content}
      </p>
    </div>
  );
}

export default function DashboardTabs({
  lookerUrl,
  clientName,
  isAdmin,
  analyticsData,
  snapshotInsights,
  snapshotUpdatedAt,
  clientId,
}: Props) {
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

  const hasLooker = !!lookerUrl;
  const hasAnalytics =
    analyticsData.ga4 !== null || analyticsData.gsc !== null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "snapshot" as Tab, label: "Snapshot" },
    ...(hasLooker ? [{ key: "full" as Tab, label: "Full Dashboard" }] : []),
    { key: "definitions" as Tab, label: "Definitions & Notes" },
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
            {/* KPI strip */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3">
                Key Metrics
              </p>
              {hasAnalytics ? (
                <AnalyticsKpiStrip
                  ga4={analyticsData.ga4}
                  gsc={analyticsData.gsc}
                />
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
                  <p className="text-sm text-zinc-500 italic">
                    KPI snapshot cards will appear here once configured.
                  </p>
                </div>
              )}
            </div>

            {/* Context panel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Context
                </p>
                <div className="flex items-center gap-3">
                  {snapshotUpdatedAt && (
                    <p className="text-xs text-zinc-600">
                      Updated{" "}
                      {new Date(snapshotUpdatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  {isAdmin && (
                    <RefreshAnalyticsButton clientId={clientId} />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <SnapshotSection
                  title="Takeaways"
                  content={
                    snapshotInsights?.takeaways ||
                    "Takeaways will appear here once analytics insights are generated."
                  }
                  isEmpty={!snapshotInsights?.takeaways}
                />
                <SnapshotSection
                  title="Anomalies"
                  content={
                    snapshotInsights?.anomalies ||
                    "No anomalies detected this period."
                  }
                  isEmpty={!snapshotInsights?.anomalies}
                />
                <SnapshotSection
                  title="Opportunities"
                  content={
                    snapshotInsights?.opportunities ||
                    "Opportunities will appear here once analytics insights are generated."
                  }
                  isEmpty={!snapshotInsights?.opportunities}
                />
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white mb-2">
                      What we changed
                    </p>
                    {isAdmin && (
                      <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                        Admin: Edit
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 italic">
                    Recent agency activity notes will appear here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Dashboard tab */}
        {activeTab === "full" && hasLooker && (
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
                url={lookerUrl!}
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
