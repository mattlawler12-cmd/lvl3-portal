"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { syncSheet, SheetRow } from "@/app/actions/projects";
import {
  applyFilters,
  groupByMonth,
  sortGroups,
  groupByCategory,
  sortRows,
  getMinutesSince,
} from "./project-helpers";
import TaskTable from "./task-table";
import HeroCard from "./hero-card";
import FiltersBar from "./filters-bar";
import CollapsibleSection, { ProgressBar } from "./collapsible-section";
import NarrativeCard from "@/components/ui/NarrativeCard";

type Props = {
  rows: SheetRow[];
  fetchedAt: string;
  isAdmin: boolean;
  sheetId: string;
  clientId: string;
  aiSummary?: string | null;
};

export default function ProjectsView({
  rows,
  fetchedAt,
  isAdmin,
  clientId,
  aiSummary,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "category" | "all">(
    "month"
  );
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    col: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [heroFilter, setHeroFilter] = useState<Set<string>>(new Set());

  const allGroups = sortGroups(groupByMonth(rows));
  const heroGroup = allGroups[0] ?? null;
  const accordionGroups = allGroups.slice(1);
  const filteredRows = applyFilters(rows, activeStatuses, activeCategory);
  const heroFilteredRows = heroGroup
    ? applyFilters(heroGroup.rows, activeStatuses, activeCategory)
    : [];
  const categoryGroups =
    viewMode === "category" ? groupByCategory(filteredRows) : [];
  const flatRows =
    viewMode === "all" ? sortRows(filteredRows, sortConfig) : [];

  const totalCompleted = rows.filter((r) => r.status === "Completed").length;
  const totalRows = rows.length;
  const minutesAgo = getMinutesSince(fetchedAt);

  const blockedCount = rows.filter((r) => r.status === "Blocked").length;

  function handleToggleStatus(status: string) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function handleHeroFilterToggle(status: string) {
    setHeroFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function handleSort(col: string) {
    setSortConfig((prev) =>
      prev?.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncSheet(clientId);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* This month's focus narrative */}
      {aiSummary && (
        <NarrativeCard
          title="This month's focus"
          body={aiSummary}
          maxChars={280}
        />
      )}
      {!aiSummary && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-3">
          <p className="text-sm text-zinc-500 italic">
            Sync the project sheet to generate a summary.
          </p>
        </div>
      )}

      {/* Waiting on you callout */}
      {blockedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <span className="text-amber-400 font-semibold text-sm">
            {blockedCount}
          </span>
          <p className="text-sm text-amber-300">
            {blockedCount === 1 ? "item" : "items"} may need your input
          </p>
        </div>
      )}

      {/* Overall progress */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">
            Overall Progress
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">
              {totalCompleted} of {totalRows} tasks completed
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                minutesAgo < 5
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500"
              }`}
            >
              {minutesAgo === 0
                ? "just synced"
                : minutesAgo === 1
                ? "1 min ago"
                : `${minutesAgo}m ago`}
            </span>
          </div>
        </div>
        <ProgressBar value={totalCompleted} total={totalRows} />
      </div>

      <FiltersBar
        allRows={rows}
        activeStatuses={activeStatuses}
        onToggleStatus={handleToggleStatus}
        onClearStatuses={() => setActiveStatuses(new Set())}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {heroGroup && viewMode !== "all" && (
        <HeroCard
          group={heroGroup}
          heroFilter={heroFilter}
          onHeroFilterToggle={handleHeroFilterToggle}
          globalFilteredRows={heroFilteredRows}
        />
      )}

      {viewMode === "month" && (
        <div className="space-y-3">
          {accordionGroups.map((group) => {
            const filteredGroupRows = applyFilters(
              group.rows,
              activeStatuses,
              activeCategory
            );
            return (
              <CollapsibleSection
                key={group.month}
                label={group.month}
                rows={filteredGroupRows}
                allRows={group.rows}
              />
            );
          })}
        </div>
      )}

      {viewMode === "category" && (
        <div className="space-y-3">
          {categoryGroups.map((g) => {
            const allCategoryRows = rows.filter(
              (r) => (r.category || "(Uncategorized)") === g.category
            );
            return (
              <CollapsibleSection
                key={g.category}
                label={g.category}
                rows={g.rows}
                allRows={allCategoryRows}
              />
            );
          })}
        </div>
      )}

      {viewMode === "all" && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden overflow-x-auto">
          <TaskTable
            rows={flatRows}
            showMonth
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>
      )}

      <div className="flex items-center justify-end text-xs text-zinc-500 pt-2">
        {isAdmin && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        )}
      </div>
    </div>
  );
}
