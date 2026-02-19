"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { generateClientSummary } from "@/app/actions/summaries";

export default function RefreshSummaryButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await generateClientSummary(clientId);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
    >
      <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
      {refreshing ? "Refreshing…" : "Refresh summary"}
    </button>
  );
}
