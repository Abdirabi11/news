import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const guard = await requireRole([Role.ADMIN, Role.EDITOR]);
  if (!guard.ok) return guard.response;

  const categories = await prisma.category.findMany({
    include: {
      translations: true,
      _count: { select: { articles: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">Categories Management</h1>
      </div>
      <div className="bg-amber-50/50 dark:bg-neutral-900 border border-amber-900/10 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-100/50 dark:bg-neutral-800 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3">Slug</th>
              <th className="p-3">Name ({locale})</th>
              <th className="p-3">Articles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {categories.map((cat) => {
              const trans = cat.translations.find((t) => t.locale === locale) || cat.translations[0];
              return (
                <tr key={cat.id}>
                  <td className="p-3 font-mono text-xs">{cat.slug}</td>
                  <td className="p-3 font-medium">{trans?.name ?? "—"}</td>
                  <td className="p-3">{cat._count.articles}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}