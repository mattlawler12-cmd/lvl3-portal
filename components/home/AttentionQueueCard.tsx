import Link from "next/link";
import { PackageOpen } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface Deliverable {
  id: string;
  title: string;
  viewed_at: string | null;
}

interface OpenThread {
  deliverableId: string;
  deliverableTitle: string;
  count: number;
}

interface Props {
  unviewedDeliverables: Deliverable[];
  openThreadsData: OpenThread[];
}

export default function AttentionQueueCard({
  unviewedDeliverables,
  openThreadsData,
}: Props) {
  type AttentionItem = { id: string; title: string; status: "new" | "needs-review" };
  const items: AttentionItem[] = [];
  const addedIds = new Set<string>();

  for (const d of unviewedDeliverables) {
    if (!addedIds.has(d.id)) {
      items.push({ id: d.id, title: d.title, status: "new" });
      addedIds.add(d.id);
    }
  }
  for (const t of openThreadsData) {
    if (!addedIds.has(t.deliverableId)) {
      items.push({ id: t.deliverableId, title: t.deliverableTitle, status: "needs-review" });
      addedIds.add(t.deliverableId);
    }
  }

  const displayItems = items.slice(0, 3);
  const remaining = items.length - displayItems.length;

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <PackageOpen size={14} className="text-zinc-500" />
          <p className="text-xs text-zinc-500">Nothing waiting on you</p>
        </div>
        <p className="text-sm text-zinc-500 italic">
          We&apos;ll pull you in when there&apos;s something to review.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="space-y-0">
        {displayItems.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 py-2.5 ${
              i < displayItems.length - 1 ? "border-b border-zinc-800" : ""
            }`}
          >
            <p className="text-sm text-zinc-300 truncate flex-1">{item.title}</p>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <p className="text-xs text-zinc-500 mt-3">+{remaining} more</p>
      )}
      <Link
        href="/deliverables"
        className="mt-4 flex items-center justify-center w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
      >
        Open deliverables
      </Link>
    </div>
  );
}
