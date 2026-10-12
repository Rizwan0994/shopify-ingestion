import { Loader2, X, Inbox } from "lucide-react";
import { useEffect } from "react";

export function Spinner({ size = 18, className = "" }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-400">
      <Spinner size={28} className="text-brand-500" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function Badge({ children, className = "" }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

const STATUS_STYLES = {
  active: "bg-accent-500/10 text-accent-600",
  draft: "bg-amber-500/10 text-amber-600",
  paused: "bg-ink-200 text-ink-600",
};
export function StatusBadge({ status }) {
  const dot = { active: "bg-accent-500", draft: "bg-amber-500", paused: "bg-ink-400" }[status] || "bg-ink-400";
  return (
    <Badge className={STATUS_STYLES[status] || "bg-ink-200 text-ink-600"}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </Badge>
  );
}

const SYNC_STYLES = {
  synced: "bg-brand-500/10 text-brand-600",
  unsynced: "bg-ink-100 text-ink-500",
  error: "bg-red-500/10 text-red-600",
};
export function SyncBadge({ status }) {
  const label = { synced: "Synced", unsynced: "Not synced", error: "Sync error" }[status] || status;
  return <Badge className={SYNC_STYLES[status] || "bg-ink-100 text-ink-500"}>{label}</Badge>;
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon size={26} />
      </div>
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {children && <p className="max-w-sm text-sm text-ink-500">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, size = "md", footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4 backdrop-blur-sm sm:p-6">
      <div
        className={`card animate-fade-in my-4 w-full ${widths[size]} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost -mr-2 h-9 w-9 !px-0">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-ink-100 bg-ink-50/50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-sm text-ink-500">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button className="btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className="btn-outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
