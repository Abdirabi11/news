import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";

export default async function AdminTagsPage() {
  const guard = await requireRole([Role.ADMIN, Role.EDITOR]);
  if (!guard.ok) return guard.response;

  const tags = await prisma.tag.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold font-serif">Tags Management</h1>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="bg-amber-100/60 dark:bg-neutral-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
            <span>#{tag.slug}</span>
            <span className="bg-amber-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full text-[10px]">
              {tag._count.articles}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}