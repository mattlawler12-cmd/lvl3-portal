import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface Props {
  totalOpenThreads: number;
  threadsByDeliverable: {
    deliverableId: string;
    deliverableTitle: string;
    count: number;
  }[];
}

export default function OpenLoopsCard({
  totalOpenThreads,
  threadsByDeliverable,
}: Props) {
  if (totalOpenThreads === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} className="text-zinc-500" />
          <p className="text-xs text-zinc-500">All threads resolved</p>
        </div>
        <p className="text-sm text-zinc-500 italic">Clean slate.</p>
      </div>
    );
  }

  const topItems = threadsByDeliverable.slice(0, 3);
  const deliverableCount = threadsByDeliverable.length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-4">
        <MessageSquare size={14} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-zinc-300">
          <span className="font-semibold text-white">{totalOpenThreads}</span>{" "}
          unresolved {totalOpenThreads === 1 ? "thread" : "threads"} across{" "}
          <span className="font-semibold text-white">{deliverableCount}</span>{" "}
          {deliverableCount === 1 ? "deliverable" : "deliverables"}
        </p>
      </div>
      <div className="space-y-2 mb-4">
        {topItems.map((item) => (
          <div
            key={item.deliverableId}
            className="flex items-center justify-between gap-3"
          >
            <p className="text-sm text-zinc-400 truncate flex-1">
              {item.deliverableTitle}
            </p>
            <span className="shrink-0 text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {item.count} {item.count === 1 ? "thread" : "threads"}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/deliverables"
        className="flex items-center justify-center w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
      >
        Review and resolve
      </Link>
    </div>
  );
}
