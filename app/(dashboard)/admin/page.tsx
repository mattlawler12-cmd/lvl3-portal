import { requireAdmin } from "@/lib/auth";
import { getClientsWithStats } from "@/app/actions/clients";
import { createServiceClient } from "@/lib/supabase/server";
import { ShieldCheck, CheckCircle, XCircle } from "lucide-react";

export default async function AdminPage() {
  await requireAdmin();

  const clients = await getClientsWithStats();

  // Fetch open thread counts per client
  const service = await createServiceClient();
  const { data: openComments } = await service
    .from("comments")
    .select("deliverables!inner(client_id)")
    .eq("resolved", false);

  const openThreadsByClient: Record<string, number> = {};
  for (const row of (openComments ?? []) as unknown as Array<{
    deliverables: { client_id: string } | null;
  }>) {
    const clientId = row.deliverables?.client_id;
    if (!clientId) continue;
    openThreadsByClient[clientId] = (openThreadsByClient[clientId] ?? 0) + 1;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-xl font-semibold text-white">Admin</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Client health and engagement overview
          </p>
        </div>
      </div>

      {/* Client health grid */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Client Health
        </p>
        {clients.length === 0 ? (
          <p className="text-sm text-zinc-500">No clients yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => {
              const openThreads = openThreadsByClient[client.id] ?? 0;
              const hasSheet = !!client.google_sheet_id;
              const hasLooker = !!client.looker_embed_url;

              return (
                <div
                  key={client.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <h3 className="text-sm font-semibold text-white">
                      {client.name}
                    </h3>
                    <a
                      href={`/clients/${client.id}`}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Manage →
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-white">
                        {client.unread_count}
                      </p>
                      <p className="text-xs text-zinc-500">Unread deliverables</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-white">{openThreads}</p>
                      <p className="text-xs text-zinc-500">Open threads</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-white">
                        {client.deliverable_count}
                      </p>
                      <p className="text-xs text-zinc-500">Deliverables</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-white">
                        {client.user_count}
                      </p>
                      <p className="text-xs text-zinc-500">Users</p>
                    </div>
                  </div>

                  {/* Connection status */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      {hasSheet ? (
                        <CheckCircle size={12} className="text-emerald-400" />
                      ) : (
                        <XCircle size={12} className="text-zinc-600" />
                      )}
                      <span className={hasSheet ? "text-zinc-300" : "text-zinc-600"}>
                        Google Sheet {hasSheet ? "connected" : "not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {hasLooker ? (
                        <CheckCircle size={12} className="text-emerald-400" />
                      ) : (
                        <XCircle size={12} className="text-zinc-600" />
                      )}
                      <span className={hasLooker ? "text-zinc-300" : "text-zinc-600"}>
                        Looker embed {hasLooker ? "connected" : "not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-3 h-3 rounded-full border border-zinc-700 flex-shrink-0" />
                      Last login: Coming soon
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
