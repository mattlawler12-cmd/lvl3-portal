import { requireAuth } from "@/lib/auth";
import { getSelectedClientId, getClientById } from "@/lib/client-resolution";
import { createServiceClient } from "@/lib/supabase/server";
import NavCards from "@/components/home/nav-cards";
import NarrativeCard from "@/components/ui/NarrativeCard";
import AttentionQueueCard from "@/components/home/AttentionQueueCard";
import OpenLoopsCard from "@/components/home/OpenLoopsCard";
import RefreshSummaryButton from "@/components/home/RefreshSummaryButton";

type HomeClient = {
  id: string;
  name: string;
  ai_summary: string | null;
  ai_summary_updated_at: string | null;
};

type UnviewedDeliverable = {
  id: string;
  title: string;
  viewed_at: string | null;
};

type OpenThread = {
  deliverableId: string;
  deliverableTitle: string;
  count: number;
};

export default async function HomePage() {
  const { user } = await requireAuth();

  const selectedClientId =
    user.role === "client" ? user.client_id : await getSelectedClientId();

  const selectedClient = selectedClientId
    ? await getClientById<HomeClient>(
        selectedClientId,
        "id, name, ai_summary, ai_summary_updated_at"
      )
    : null;

  const isAdmin = user.role === "admin";
  const showSelector = user.role !== "client";

  let unviewedDeliverables: UnviewedDeliverable[] = [];
  let openThreadsData: OpenThread[] = [];
  let recentPosts: {
    id: string;
    title: string;
    body: string;
    category: string | null;
    created_at: string;
  }[] = [];

  if (selectedClient) {
    const service = await createServiceClient();

    const [unviewedResult, threadsResult, postsResult] = await Promise.all([
      service
        .from("deliverables")
        .select("id, title, viewed_at")
        .eq("client_id", selectedClient.id)
        .is("viewed_at", null)
        .order("created_at", { ascending: false }),
      service
        .from("comments")
        .select("deliverable_id, deliverables!inner(id, title, client_id)")
        .eq("resolved", false)
        .eq("deliverables.client_id", selectedClient.id),
      service
        .from("posts")
        .select("id, title, body, category, created_at")
        .or(
          `target_client_id.eq.${selectedClient.id},target_client_id.is.null`
        )
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

    unviewedDeliverables = (unviewedResult.data ?? []) as UnviewedDeliverable[];

    const threadMap = new Map<string, { title: string; count: number }>();
    for (const row of (threadsResult.data ?? []) as unknown as Array<{
      deliverable_id: string;
      deliverables: { id: string; title: string } | null;
    }>) {
      const d = row.deliverables;
      if (!d) continue;
      const existing = threadMap.get(d.id);
      if (existing) {
        existing.count++;
      } else {
        threadMap.set(d.id, { title: d.title, count: 1 });
      }
    }
    openThreadsData = Array.from(threadMap.entries()).map(
      ([deliverableId, { title, count }]) => ({
        deliverableId,
        deliverableTitle: title,
        count,
      })
    );

    recentPosts = (postsResult.data ?? []) as typeof recentPosts;
  }

  const totalOpenThreads = openThreadsData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">
          This week at a glance
        </h1>
        {selectedClient && (
          <p className="mt-1 text-sm text-zinc-400">{selectedClient.name}</p>
        )}
      </div>

      {/* No client selected */}
      {!selectedClient && showSelector && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
          <p className="text-sm text-zinc-400">
            Select a client from the workspace selector above to view their
            overview.
          </p>
        </div>
      )}

      {selectedClient && (
        <>
          {/* KPI strip placeholder */}
          <section>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
              Key Metrics
            </p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
              <p className="text-sm text-zinc-500 italic">
                KPI cards will appear here once configured by your admin.
              </p>
            </div>
          </section>

          {/* Attention + Open loops */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
                Needs Your Review
              </p>
              <AttentionQueueCard
                unviewedDeliverables={unviewedDeliverables}
                openThreadsData={openThreadsData}
              />
            </section>
            <section>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
                Open Loops
              </p>
              <OpenLoopsCard
                totalOpenThreads={totalOpenThreads}
                threadsByDeliverable={openThreadsData}
              />
            </section>
          </div>

          {/* Key movements narrative */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Key Movements
              </p>
              {isAdmin && (
                <RefreshSummaryButton clientId={selectedClient.id} />
              )}
            </div>
            {selectedClient.ai_summary ? (
              <NarrativeCard
                title="This month's work"
                body={selectedClient.ai_summary}
                maxChars={280}
                footer={
                  selectedClient.ai_summary_updated_at ? (
                    <p className="text-xs text-zinc-600">
                      Last updated{" "}
                      {new Date(
                        selectedClient.ai_summary_updated_at
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  ) : undefined
                }
              />
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
                <p className="text-sm text-zinc-500 italic">
                  No summary yet. Sync the project sheet to generate one.
                </p>
              </div>
            )}
          </section>

          {/* Recent insights */}
          {recentPosts.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
                Recent Insights
              </p>
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <a
                    key={post.id}
                    href="/insights"
                    className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-white">
                        {post.title}
                      </h3>
                      {post.category && (
                        <span className="shrink-0 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                          {post.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {post.body.slice(0, 160)}
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Quick nav — below fold */}
      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Quick Nav
        </p>
        <NavCards compact />
      </section>
    </div>
  );
}
