import { requireAuth } from "@/lib/auth";
import DeliverablesClient from "@/components/deliverables/deliverables-client";
import type { DeliverableWithClient } from "@/app/actions/deliverables";

export type DeliverableWithCounts = DeliverableWithClient & {
  unresolvedCount: number;
  totalCommentCount: number;
};

export default async function DeliverablesPage() {
  const { supabase, user } = await requireAuth();
  const isAdmin = user.role === "admin";

  const { data: deliverables } = await supabase
    .from("deliverables")
    .select("*, clients(id, name, slug)")
    .order("created_at", { ascending: false });

  const deliverableIds = (deliverables ?? []).map((d) => d.id);
  const commentCounts: Record<string, { total: number; unresolved: number }> =
    {};

  if (deliverableIds.length > 0) {
    const { data: comments } = await supabase
      .from("comments")
      .select("deliverable_id, resolved")
      .in("deliverable_id", deliverableIds);

    for (const c of comments ?? []) {
      if (!commentCounts[c.deliverable_id]) {
        commentCounts[c.deliverable_id] = { total: 0, unresolved: 0 };
      }
      commentCounts[c.deliverable_id].total++;
      if (!c.resolved) commentCounts[c.deliverable_id].unresolved++;
    }
  }

  const deliverablesWithCounts: DeliverableWithCounts[] = (
    deliverables ?? []
  ).map((d) => ({
    ...(d as DeliverableWithClient),
    unresolvedCount: commentCounts[d.id]?.unresolved ?? 0,
    totalCommentCount: commentCounts[d.id]?.total ?? 0,
  }));

  let clients: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    clients = data ?? [];
  }

  return (
    <DeliverablesClient
      initialDeliverables={deliverablesWithCounts}
      clients={clients}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  );
}
