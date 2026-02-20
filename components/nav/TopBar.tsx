"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, HelpCircle, ChevronDown, LogOut, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setSelectedClient } from "@/app/actions/client-selection";

interface TopBarProps {
  userEmail: string;
  userRole: "admin" | "member" | "client";
  clientList: { id: string; name: string }[];
  selectedClientId: string | null;
  selectedClientName: string | null;
  showClientSelector: boolean;
  summaryUpdatedAt: string | null;
  unreadCount: number;
  onSearchOpen: () => void;
  onNotificationsOpen: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  client: "Client",
};

export default function TopBar({
  userEmail,
  userRole,
  clientList,
  selectedClientId,
  selectedClientName,
  showClientSelector,
  summaryUpdatedAt,
  unreadCount,
  onSearchOpen,
  onNotificationsOpen,
}: TopBarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const supabase = createClient();

  const showSelector = showClientSelector && clientList.length > 1;

  async function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await setSelectedClient(e.target.value || null);
    router.refresh();
  }

  async function handleSignOut() {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface-900 border-b border-surface-700 z-30 flex items-center px-4 gap-3">
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 rounded"
      >
        <span className="text-brand-400 font-bold tracking-tight">LVL3</span>
        <span className="text-surface-400 text-xs font-medium uppercase tracking-widest hidden sm:inline">
          Portal
        </span>
      </Link>

      <div className="h-5 w-px bg-surface-700 shrink-0" />

      {/* Client switcher */}
      <div className="flex flex-col min-w-0 max-w-[200px]">
        <span className="text-[10px] text-surface-500 uppercase tracking-wider leading-none mb-0.5">
          Workspace
        </span>
        {showSelector ? (
          <select
            value={selectedClientId ?? ""}
            onChange={handleClientChange}
            className="bg-transparent border-none text-sm text-surface-100 focus:outline-none cursor-pointer truncate"
          >
            <option value="">Select a client</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : selectedClientName ? (
          <span className="text-sm text-surface-100 font-medium truncate">
            {selectedClientName}
          </span>
        ) : (
          <span className="text-sm text-surface-400">Select a client</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center gap-2 bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-surface-400 hover:border-surface-500 hover:text-surface-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400"
        aria-label="Open search (Cmd+K)"
      >
        <Search size={13} />
        <span>Search…</span>
        <kbd className="hidden lg:inline-flex items-center text-[10px] text-surface-400 bg-surface-700 border border-surface-600/50 rounded px-1 py-0.5">
          ⌘K
        </kbd>
      </button>

      {/* Last updated */}
      {summaryUpdatedAt && (
        <span
          className="hidden lg:block text-xs text-surface-500 shrink-0"
          title={`Client data last synced: ${new Date(summaryUpdatedAt).toLocaleString()}`}
        >
          Updated {formatRelativeTime(summaryUpdatedAt)}
        </span>
      )}

      {/* Notifications */}
      <button
        onClick={onNotificationsOpen}
        className="relative p-2 rounded-lg text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-brand-400 text-surface-950 text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Help */}
      <a
        href="#"
        className="p-2 rounded-lg text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400"
        aria-label="Help"
      >
        <HelpCircle size={17} />
      </a>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-1.5 p-1.5 rounded-lg text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400"
          aria-label="User menu"
          aria-expanded={userMenuOpen}
        >
          <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-xs font-semibold text-surface-100">
            {userEmail.slice(0, 1).toUpperCase()}
          </div>
          <ChevronDown
            size={13}
            className={`hidden sm:block transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-1 w-56 bg-surface-900 border border-surface-700 rounded-xl shadow-xl z-50 py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-700">
                <p className="text-sm text-surface-100 font-medium truncate">{userEmail}</p>
                <span className="inline-flex items-center text-xs bg-brand-400/15 text-brand-400 px-2 py-0.5 rounded-full mt-1">
                  {ROLE_LABELS[userRole] ?? userRole}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
