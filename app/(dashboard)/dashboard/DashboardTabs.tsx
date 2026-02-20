"use client";

import { useState } from "react";
import LookerEmbed from "@/components/dashboard/looker-embed";
import AnalyticsKpiStrip from "@/components/analytics/AnalyticsKpiStrip";
import RefreshAnalyticsButton from "@/components/home/RefreshAnalyticsButton";
import WebsiteTab from "@/components/analytics/website/WebsiteTab";
import SeoTab from "@/components/analytics/seo/SeoTab";
import type { AnalyticsData, SnapshotInsights, DashboardReport } from "@/app/actions/analytics";

interface Props {
  lookerUrl: string | null;
  clientName: string;
  isAdmin: boolean;
  analyticsData: AnalyticsData;
  snapshotInsights: SnapshotInsights | null;
  snapshotUpdatedAt: string | null;
  clientId: string;
  dashboardReport: DashboardReport;
}

type Tab = "snapshot" | "website" | "seo" | "full" | "definitions";

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
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-surface-100 mb-2">{title}</p>
      <p className={`text-sm leading-relaxed ${isEmpty ? "text-surface-500 italic" : "text-surface-300"}`}>
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
  dashboardReport,
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
    ...(hasAnalytics ? [{ key: "website" as Tab, label: "Website" }] : []),
    ...(hasAnalytics ? [{ key: "seo" as Tab, label: "SEO" }] : []),
    ...(hasLooker ? [{ key: "full" as Tab, label: "Full Dashboard" }] : []),
    { key: "definitions" as Tab, label: "Definitions & Notes" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-surface-700 px-6 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900 ${
              activeTab === tab.key
                ? "border-brand-400 text-brand-400"
                : "border-transparent text-surface-400 hover:text-surface-200"
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
              <p className="text-xs font-medium uppercase tracking-widest text-surface-500 mb-3">
                Key Metrics
              </p>
              {hasAnalytics ? (
                <AnalyticsKpiStrip
                  ga4={analyticsData.ga4}
                  gsc={analyticsData.gsc}
                />
              ) : (
                <div className="rounded-xl border border-surface-700 bg-surface-900/50 px-5 py-4">
                  <p className="text-sm text-surface-500 italic">
                    KPI snapshot cards will appear here once configured.
                  </p>
                </div>
              )}
            </div>

            {/* Context panel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-widest text-surface-500">
                  Context
                </p>
                <div className="flex items-center gap-3">
                  {snapshotUpdatedAt && (
                    <p className="text-xs text-surface-500">
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
                <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-surface-100 mb-2">
                      What we changed
                    </p>
                    {isAdmin && (
                      <button className="text-xs text-surface-500 hover:text-surface-400 transition-colors shrink-0">
                        Admin: Edit
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-surface-500 italic">
                    Recent agency activity notes will appear here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Website tab */}
        {activeTab === "website" && (
          <WebsiteTab ga4={dashboardReport.ga4} />
        )}

        {/* SEO tab */}
        {activeTab === "seo" && (
          <SeoTab
            ga4={dashboardReport.ga4}
            gsc={dashboardReport.gsc}
            gscError={dashboardReport.gscError}
            isAdmin={isAdmin}
          />
        )}

        {/* Full Dashboard tab */}
        {activeTab === "full" && hasLooker && (
          <div className="h-full flex flex-col">
            {iframeTimedOut && !iframeEverActive && (
              <div className="px-6 py-3 bg-surface-900/50 border-b border-surface-700 text-sm text-surface-400">
                Loading full dashboard. KPI snapshot is ready.{" "}
                <button
                  onClick={() => handleTabChange("snapshot")}
                  className="text-surface-300 underline underline-offset-2 hover:text-surface-100 transition-colors"
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
            <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-surface-100 mb-2">
                  Metric Definitions & Methodology
                </p>
                {isAdmin && (
                  <button className="text-xs text-surface-500 hover:text-surface-400 transition-colors shrink-0">
                    Admin: Edit
                  </button>
                )}
              </div>
              <p className="text-sm text-surface-500 italic">
                Metric definitions and methodology notes will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
