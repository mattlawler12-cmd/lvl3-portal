'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  FolderKanban,
  LayoutDashboard,
  PackageOpen,
  Lightbulb,
  Sparkles,
  ShieldCheck,
  LogOut,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setSelectedClient } from '@/app/actions/client-selection'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Deliverables', href: '/deliverables', icon: PackageOpen },
  { label: 'Insights', href: '/insights', icon: Lightbulb },
  { label: 'Services', href: '/services', icon: Sparkles },
]

const CLIENTS_NAV_ITEM: NavItem = {
  label: 'Clients',
  href: '/clients',
  icon: Users,
}

const ADMIN_NAV_ITEM: NavItem = {
  label: 'Admin',
  href: '/admin',
  icon: ShieldCheck,
}

interface SidebarProps {
  userEmail: string
  isAdmin: boolean
  clientList: { id: string; name: string }[]
  selectedClientId: string | null
  showClientSelector: boolean
}

export default function Sidebar({
  userEmail,
  isAdmin,
  clientList,
  selectedClientId,
  showClientSelector,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = isAdmin ? [...NAV_ITEMS, CLIENTS_NAV_ITEM, ADMIN_NAV_ITEM] : NAV_ITEMS

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value || null
    await setSelectedClient(id)
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-zinc-950 border-r border-zinc-800">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-zinc-800">
        <span className="text-white text-2xl font-bold tracking-tight">
          LVL3
        </span>
        <span className="ml-2 text-zinc-500 text-xs font-medium uppercase tracking-widest">
          Portal
        </span>
      </div>

      {/* Client selector */}
      {showClientSelector && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <label className="block text-zinc-500 text-xs font-medium mb-1.5">
            Client
          </label>
          <select
            value={selectedClientId ?? ''}
            onChange={handleClientChange}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a client</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-zinc-800 space-y-2">
        <p className="text-zinc-500 text-xs truncate px-1">{userEmail}</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
