import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/server/db/client";

export default async function AdminUsersPage() {
  const guard = await requireRole([Role.ADMIN]);
  if (!guard.ok) return guard.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold font-serif">User Directory & Roles</h1>
      <div className="bg-amber-50/50 dark:bg-neutral-900 border border-amber-900/10 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-100/50 dark:bg-neutral-800 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-medium">{u.name ?? "—"}</td>
                <td className="p-3 text-neutral-600 dark:text-neutral-400">{u.email}</td>
                <td className="p-3 font-semibold">{u.role}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}