import { requireAuth } from "@/lib/auth";
import { resolveSelectedClientId, getClientById } from "@/lib/client-resolution";
import { fetchAnalyticsData, fetchDashboardReport, type AnalyticsData, type DashboardReport } from "@/app/actions/analytics";
import { BarChart2 } from "lucide-react";
import DashboardTabs from "./DashboardTabs";

export default async function DashboardPage() {
  const { user } = await requireAuth();

  type ClientRow = {
    id: string;
    name: string;
    looker_embed_url: string | null;
    snapshot_insights: import("@/app/actions/analytics").SnapshotInsights | null;
    analytics_summary_updated_at: string | null;
  };

  const selectedClientId = await resolveSelectedClientId(user);

  const selectedClient = selectedClientId
    ? await getClientById<ClientRow>(
        selectedClientId,
        "id, name, looker_embed_url, snapshot_insights, analytics_summary_updated_at"
      )
    : null;

  const showSelector = user.role === "admin" || user.role === "member";
  const isAdmin = user.role === "admin";
  const lookerUrl = selectedClient?.looker_embed_url ?? null;

  if (!selectedClient && showSelector) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center p-8">
        <BarChart2 className="w-10 h-10 text-surface-500 mb-3" />
        <p className="text-surface-400">
          Select a client from the workspace selector to view their dashboard.
        </p>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center p-8">
        <BarChart2 className="w-10 h-10 text-surface-500 mb-3" />
        <p className="text-surface-400">No client assigned to your account.</p>
      </div>
    );
  }

  // Fetch analytics data (returns null fields if not configured)
  let analyticsData: AnalyticsData = { ga4: null, gsc: null };
  try {
    analyticsData = await fetchAnalyticsData(selectedClient.id);
  } catch {
    // Non-fatal — dashboard still renders without analytics
  }

  let dashboardReport: DashboardReport = { ga4: null, gsc: null };
  try {
    dashboardReport = await fetchDashboardReport(selectedClient.id);
  } catch {
    // Non-fatal
  }

  const hasAnalytics = analyticsData.ga4 !== null || analyticsData.gsc !== null;

  if (!lookerUrl && !hasAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center p-8">
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-8 max-w-md">
          <BarChart2 className="w-10 h-10 text-surface-500 mb-3 mx-auto" />
          <h3 className="text-surface-100 font-semibold mb-2">Dashboard Coming Soon</h3>
          <p className="text-surface-400 text-sm">
            Your dashboard is being set up — check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      <div className="px-6 py-4 border-b border-surface-700 shrink-0">
        <h1 className="text-xl font-semibold text-surface-100">Dashboard</h1>
        <p className="mt-1 text-surface-400 text-sm">{selectedClient.name}</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <DashboardTabs
          lookerUrl={lookerUrl}
          clientName={selectedClient.name}
          isAdmin={isAdmin}
          analyticsData={analyticsData}
          snapshotInsights={selectedClient.snapshot_insights ?? null}
          snapshotUpdatedAt={selectedClient.analytics_summary_updated_at ?? null}
          clientId={selectedClient.id}
          dashboardReport={dashboardReport}
        />
      </div>
    </div>
  );
}
