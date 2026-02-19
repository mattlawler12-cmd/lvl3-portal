import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import LayoutShell from "@/components/nav/LayoutShell";
import {
  getClientListForUser,
  getSelectedClientId,
  getClientById,
} from "@/lib/client-resolution";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "member") as "admin" | "member" | "client";
  const isAdmin = role === "admin";

  const { clientList, autoSelectedClientId, showSelector } =
    await getClientListForUser(user.id, role, profile?.client_id ?? null);

  const cookieClientId = await getSelectedClientId();

  let selectedClientId: string | null;
  if (role === "client") {
    selectedClientId = autoSelectedClientId;
  } else {
    selectedClientId =
      cookieClientId && clientList.some((c) => c.id === cookieClientId)
        ? cookieClientId
        : null;
  }

  type ClientBasic = {
    id: string;
    name: string;
    ai_summary_updated_at: string | null;
  };
  const selectedClient = selectedClientId
    ? await getClientById<ClientBasic>(
        selectedClientId,
        "id, name, ai_summary_updated_at"
      )
    : null;

  let unreadCount = 0;
  let deliverableBadgeCount = 0;
  let postsBadgeCount = 0;
  let servicesBadgeCount = 0;
  let unviewedDeliverables: {
    id: string;
    title: string;
    viewed_at: string | null;
  }[] = [];
  let openThreadDeliverables: {
    deliverableId: string;
    title: string;
    threadCount: number;
  }[] = [];

  if (selectedClientId) {
    const service = await createServiceClient();

    const [unviewedResult, postsResult, servicesResult, threadsResult] =
      await Promise.all([
        service
          .from("deliverables")
          .select("id, title, viewed_at")
          .eq("client_id", selectedClientId)
          .is("viewed_at", null),
        service
          .from("posts")
          .select("id", { count: "exact", head: true })
          .or(
            `target_client_id.eq.${selectedClientId},target_client_id.is.null`
          ),
        service
          .from("services")
          .select("id", { count: "exact", head: true }),
        service
          .from("comments")
          .select("deliverable_id, deliverables!inner(id, title, client_id)")
          .eq("resolved", false)
          .eq("deliverables.client_id", selectedClientId),
      ]);

    unviewedDeliverables = (unviewedResult.data ?? []) as typeof unviewedDeliverables;
    unreadCount = unviewedDeliverables.length;
    postsBadgeCount = postsResult.count ?? 0;
    servicesBadgeCount = servicesResult.count ?? 0;

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
    openThreadDeliverables = Array.from(threadMap.entries()).map(
      ([deliverableId, info]) => ({
        deliverableId,
        title: info.title,
        threadCount: info.count,
      })
    );

    const deliverableIdsWithThreads = new Set(
      openThreadDeliverables.map((d) => d.deliverableId)
    );
    const unviewedIds = new Set(unviewedDeliverables.map((d) => d.id));
    deliverableBadgeCount = new Set([
      ...Array.from(deliverableIdsWithThreads),
      ...Array.from(unviewedIds),
    ]).size;
  }

  return (
    <LayoutShell
      userEmail={user.email ?? ""}
      userRole={role}
      isAdmin={isAdmin}
      clientList={clientList}
      selectedClientId={selectedClientId}
      selectedClientName={selectedClient?.name ?? null}
      showClientSelector={showSelector}
      summaryUpdatedAt={selectedClient?.ai_summary_updated_at ?? null}
      unreadCount={unreadCount}
      deliverableBadgeCount={deliverableBadgeCount}
      postsBadgeCount={postsBadgeCount}
      servicesBadgeCount={servicesBadgeCount}
      unviewedDeliverables={unviewedDeliverables}
      openThreadDeliverables={openThreadDeliverables}
    >
      {children}
    </LayoutShell>
  );
}
