import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-surface px-6 py-16 text-center shadow-soft">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-canvas text-ink-muted">
        <Icon className="h-8 w-8" aria-hidden />
      </span>
      <h3 className="mt-5 font-serif text-xl font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
