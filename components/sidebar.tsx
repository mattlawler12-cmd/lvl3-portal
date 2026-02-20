"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, FolderKanban, LayoutDashboard, PackageOpen,
  Lightbulb, Sparkles, ShieldCheck, Users,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

interface SidebarProps {
  isAdmin: boolean;
  collapsed: boolean;
  onToggle: () => void;
  deliverableBadgeCount: number;
  postsBadgeCount: number;
  servicesBadgeCount: number;
  onSearchOpen: () => void;
}

// Ink-context colour helpers — the dark sidebar uses CSS variables so
// the light surface-* token remapping doesn't bleed into nav elements.
const NAV_TEXT        = 'var(--nav-text)'        // #d4c098 warm tan
const NAV_TEXT_BRIGHT = 'var(--nav-text-bright)' // #fdf6e3 cream
const NAV_HOVER_BG    = 'var(--nav-hover)'        // #251c0d
const NAV_ACTIVE      = 'var(--nav-active)'       // #FEC77C marigold
const NAV_ACTIVE_BG   = 'rgba(254,199,124,0.12)'

export default function Sidebar({
  isAdmin, collapsed, onToggle,
  deliverableBadgeCount, postsBadgeCount, servicesBadgeCount, onSearchOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: "Home",         href: "/",             icon: Home },
    { label: "Projects",     href: "/projects",     icon: FolderKanban },
    { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
    { label: "Deliverables", href: "/deliverables", icon: PackageOpen, badge: deliverableBadgeCount || undefined },
    { label: "Insights",     href: "/insights",     icon: Lightbulb,   badge: postsBadgeCount || undefined },
    { label: "Services",     href: "/services",     icon: Sparkles,    badge: servicesBadgeCount || undefined },
    ...(isAdmin ? [
      { label: "Clients", href: "/clients", icon: Users },
      { label: "Admin",   href: "/admin",   icon: ShieldCheck },
    ] : []),
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar — fixed, starts below 56px top bar */}
      <aside
        className={`hidden md:flex flex-col fixed top-14 left-0 bottom-0 z-20 transition-all duration-200 overflow-hidden ${collapsed ? "w-14" : "w-56"}`}
        style={{ backgroundColor: 'var(--nav-bg)', borderRight: '1px solid var(--nav-border)' }}
      >
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ label, href, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <div key={href} className="relative">
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset ${collapsed ? "justify-center" : ""}`}
                  style={{
                    color:           active ? NAV_ACTIVE    : NAV_TEXT,
                    backgroundColor: active ? NAV_ACTIVE_BG : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLAnchorElement
                      el.style.color           = NAV_TEXT_BRIGHT
                      el.style.backgroundColor = NAV_HOVER_BG
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLAnchorElement
                      el.style.color           = NAV_TEXT
                      el.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {badge && badge > 0 && (
                        <span
                          className="text-xs rounded-full px-1.5 py-0.5 leading-none shrink-0"
                          style={{ backgroundColor: NAV_ACTIVE_BG, color: NAV_ACTIVE }}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
                {collapsed && badge && badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full pointer-events-none bg-brand-400" />
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid #3a2e18' }}>
          {collapsed && (
            <button
              onClick={onSearchOpen}
              title="Search (⌘K)"
              className="flex items-center justify-center w-full px-2.5 py-2 rounded transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              style={{ color: NAV_TEXT }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.color           = NAV_TEXT_BRIGHT
                el.style.backgroundColor = NAV_HOVER_BG
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.color           = NAV_TEXT
                el.style.backgroundColor = 'transparent'
              }}
              aria-label="Open search"
            >
              <Search size={16} />
            </button>
          )}
          <button
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center w-full px-2.5 py-2 rounded transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            style={{ color: NAV_TEXT }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color           = NAV_TEXT_BRIGHT
              el.style.backgroundColor = NAV_HOVER_BG
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color           = NAV_TEXT
              el.style.backgroundColor = 'transparent'
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={15} /> : (
              <span className="flex items-center gap-2 text-xs whitespace-nowrap">
                <ChevronLeft size={15} />
                <span>Collapse</span>
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-20 flex items-center justify-around px-4"
        style={{ backgroundColor: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}
      >
        <Link
          href="/"
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          style={{ color: pathname === "/" ? NAV_ACTIVE : NAV_TEXT }}
        >
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link
          href="/deliverables"
          className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          style={{ color: pathname.startsWith("/deliverables") ? NAV_ACTIVE : NAV_TEXT }}
        >
          <PackageOpen size={20} />
          {deliverableBadgeCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-brand-400 rounded-full" />
          )}
          <span className="text-[10px]">Deliverables</span>
        </Link>
        <button
          onClick={onSearchOpen}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          style={{ color: NAV_TEXT }}
          aria-label="Search"
        >
          <Search size={20} />
          <span className="text-[10px]">Search</span>
        </button>
      </nav>
    </>
  );
}
