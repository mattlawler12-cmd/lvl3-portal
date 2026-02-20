import {
  Sparkles,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";

type Status =
  | "new"
  | "needs-review"
  | "in-progress"
  | "blocked"
  | "resolved"
  | "opportunity";

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: React.ElementType; className: string }
> = {
  new: {
    label: "New",
    icon: Sparkles,
    className:
      "bg-brand-400/10 text-brand-400 border-brand-400/20",
  },
  "needs-review": {
    label: "Needs review",
    icon: Clock,
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  "in-progress": {
    label: "In progress",
    icon: RefreshCw,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  blocked: {
    label: "Blocked",
    icon: AlertCircle,
    className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle,
    className: "bg-surface-700/50 text-surface-400 border-surface-600",
  },
  opportunity: {
    label: "Opportunity",
    icon: Zap,
    className: "bg-accent-400/10 text-accent-400 border-accent-400/20",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${config.className} ${className}`}
    >
      <Icon size={11} aria-hidden="true" />
      {config.label}
    </span>
  );
}
