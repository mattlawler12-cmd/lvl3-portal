import Link from "next/link";
import {
  FolderKanban,
  LayoutDashboard,
  PackageOpen,
  Lightbulb,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const NAV_CARDS = [
  { href: "/projects", icon: FolderKanban, title: "Projects", description: "Track monthly SEO tasks" },
  { href: "/dashboard", icon: LayoutDashboard, title: "Dashboard", description: "View your analytics" },
  { href: "/deliverables", icon: PackageOpen, title: "Deliverables", description: "Reports and documents" },
  { href: "/insights", icon: Lightbulb, title: "Insights", description: "SEO insights and updates" },
  { href: "/services", icon: Sparkles, title: "Services", description: "Our service offerings" },
];

export default function NavCards({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {NAV_CARDS.map(({ href, icon: Icon, title }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <Icon size={16} className="text-zinc-400" strokeWidth={1.8} />
            <p className="text-xs text-zinc-400">{title}</p>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {NAV_CARDS.map(({ href, icon: Icon, title, description }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors group-hover:bg-zinc-700 group-hover:text-white">
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <ArrowRight
              size={14}
              className="text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-400"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
