"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Home, FolderKanban, LayoutDashboard, PackageOpen, Lightbulb, Sparkles } from "lucide-react";

interface Result {
  id: string;
  label: string;
  sublabel?: string;
  category: string;
  href: string;
  icon?: React.ElementType;
}

const QUICK_ACTIONS: Result[] = [
  { id: "qa-home", label: "Go to Home", category: "Navigation", href: "/", icon: Home },
  { id: "qa-dashboard", label: "Go to Dashboard", category: "Navigation", href: "/dashboard", icon: LayoutDashboard },
  { id: "qa-deliverables", label: "Go to Deliverables", category: "Navigation", href: "/deliverables", icon: PackageOpen },
  { id: "qa-projects", label: "Go to Projects", category: "Navigation", href: "/projects", icon: FolderKanban },
  { id: "qa-insights", label: "Go to Insights", category: "Navigation", href: "/insights", icon: Lightbulb },
  { id: "qa-services", label: "Go to Services", category: "Navigation", href: "/services", icon: Sparkles },
];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface Props {
  selectedClientId: string | null;
  onClose: () => void;
}

export default function CommandPalette({ onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>(QUICK_ACTIONS);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter results
  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setResults(QUICK_ACTIONS);
      setActiveIndex(0);
      return;
    }
    const filtered = QUICK_ACTIONS.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
    setResults(filtered);
    setActiveIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (result: Result) => {
      router.push(result.href);
      onClose();
    },
    [router, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[activeIndex];
        if (selected) handleSelect(selected);
      }
      // Focus trap
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const els = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results, activeIndex, handleSelect, onClose]);

  // Group results by category
  const grouped: Record<string, Result[]> = {};
  for (const r of results) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }

  let globalIndex = 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 animate-slide-in-up"
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <Search size={16} className="text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, deliverables, insights…"
              className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
              aria-label="Search"
            />
            <kbd className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                    {category}
                  </p>
                  {items.map((item) => {
                    const idx = globalIndex++;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors focus-visible:outline-none ${
                          idx === activeIndex
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-300 hover:bg-zinc-800/50"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            size={15}
                            className="shrink-0 text-zinc-500"
                          />
                        )}
                        <span className="flex-1 text-left truncate">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-xs text-zinc-600 shrink-0">
                            {item.sublabel}
                          </span>
                        )}
                        <ArrowRight
                          size={13}
                          className="text-zinc-600 shrink-0"
                        />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-600">
            <span>
              <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5">↑↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5">↵</kbd>{" "}
              select
            </span>
            <span>
              <kbd className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5">esc</kbd>{" "}
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
