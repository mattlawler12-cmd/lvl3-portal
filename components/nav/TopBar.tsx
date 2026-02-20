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
    <header
      className="fixed top-0 left-0 right-0 h-14 z-30 flex items-center px-4 gap-3"
      style={{ backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }}
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-1.5 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span className="font-bold tracking-tight text-base" style={{ color: 'var(--color-gold-deep)', fontFamily: 'var(--font-playfair), Georgia, serif' }}>LVL3</span>
        <span className="hidden sm:inline text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--nav-text)', letterSpacing: '0.06em' }}>
          Portal
        </span>
      </Link>

      <div className="h-5 w-px shrink-0" style={{ backgroundColor: 'var(--nav-border)', opacity: 0.5 }} />

      {/* Client switcher */}
      <div className="flex flex-col min-w-0 max-w-[200px]">
        <span className="text-[10px] font-medium uppercase tracking-wider leading-none mb-0.5" style={{ color: 'var(--nav-text)', letterSpacing: '0.12em' }}>
          Workspace
        </span>
        {showSelector ? (
          <select
            value={selectedClientId ?? ""}
            onChange={handleClientChange}
            className="bg-transparent border-none text-sm focus:outline-none cursor-pointer truncate"
            style={{ color: 'var(--nav-text-bright)', fontFamily: 'var(--font-dm-sans)' }}
          >
            <option value="" style={{ backgroundColor: 'var(--nav-bg)' }}>Select a client</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id} style={{ backgroundColor: 'var(--nav-bg)' }}>
                {c.name}
              </option>
            ))}
          </select>
        ) : selectedClientName ? (
          <span className="text-sm font-medium truncate" style={{ color: 'var(--nav-text-bright)' }}>
            {selectedClientName}
          </span>
        ) : (
          <span className="text-sm" style={{ color: 'var(--nav-text)' }}>Select a client</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        style={{
          backgroundColor: 'var(--nav-hover)',
          border: '1px solid var(--nav-border)',
          color: 'var(--nav-text)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--nav-text-bright)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--nav-text)' }}
        aria-label="Open search (Cmd+K)"
      >
        <Search size={13} />
        <span>Search…</span>
        <kbd
          className="hidden lg:inline-flex items-center text-[10px] rounded px-1 py-0.5"
          style={{ backgroundColor: 'var(--nav-hover)', border: '1px solid var(--nav-border)', color: 'var(--nav-text)' }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Last updated */}
      {summaryUpdatedAt && (
        <span
          className="hidden lg:block text-xs shrink-0"
          style={{ color: 'var(--nav-text)' }}
          title={`Client data last synced: ${new Date(summaryUpdatedAt).toLocaleString()}`}
        >
          Updated {formatRelativeTime(summaryUpdatedAt)}
        </span>
      )}

      {/* Notifications */}
      <button
        onClick={onNotificationsOpen}
        className="relative p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        style={{ color: 'var(--nav-text)' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'var(--nav-text-bright)'
          el.style.backgroundColor = 'var(--nav-hover)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'var(--nav-text)'
          el.style.backgroundColor = 'transparent'
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-brand-400 text-[10px] font-bold rounded-full flex items-center justify-center px-0.5" style={{ color: 'var(--color-ink)' }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Help */}
      <a
        href="#"
        className="p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        style={{ color: 'var(--nav-text)' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.color = 'var(--nav-text-bright)'
          el.style.backgroundColor = 'var(--nav-hover)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.color = 'var(--nav-text)'
          el.style.backgroundColor = 'transparent'
        }}
        aria-label="Help"
      >
        <HelpCircle size={17} />
      </a>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-1.5 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = 'var(--nav-text-bright)'
            el.style.backgroundColor = 'var(--nav-hover)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = 'var(--nav-text)'
            el.style.backgroundColor = 'transparent'
          }}
          aria-label="User menu"
          aria-expanded={userMenuOpen}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-ink)', color: 'var(--color-marigold)' }}
          >
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
            <div
              className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.2)] z-50 py-1 animate-fade-in"
              style={{ backgroundColor: 'var(--nav-bg)', border: '1px solid var(--nav-border)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--nav-border)' }}>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--nav-text-bright)' }}>{userEmail}</p>
                <span
                  className="inline-flex items-center text-xs px-2 py-0.5 rounded-full mt-1"
                  style={{ backgroundColor: 'rgba(254,199,124,0.15)', color: 'var(--color-marigold)' }}
                >
                  {ROLE_LABELS[userRole] ?? userRole}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--nav-text)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = 'var(--nav-text-bright)'
                  el.style.backgroundColor = 'var(--nav-hover)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = 'var(--nav-text)'
                  el.style.backgroundColor = 'transparent'
                }}
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
