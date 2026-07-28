import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  basePath: string;
  page: number;
  totalPages: number;
}

const withPage = (basePath: string, page: number): string =>
  `${basePath}${basePath.includes("?") ? "&" : "?"}page=${page}`;

export function Pagination({ basePath, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  const linkCls =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900";

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-4 text-sm"
    >
      {page > 1 ? (
        <Link
          href={withPage(basePath, page - 1)}
          aria-label="Previous page"
          className={linkCls}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      ) : (
        <span className={`${linkCls} pointer-events-none opacity-40`}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </span>
      )}

      <span className="tabular-nums text-zinc-500">
        {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={withPage(basePath, page + 1)}
          aria-label="Next page"
          className={linkCls}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      ) : (
        <span className={`${linkCls} pointer-events-none opacity-40`}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </span>
      )}
    </nav>
  );
}
