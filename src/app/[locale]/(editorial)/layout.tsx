import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import {
  FileText,
  Image as ImageIcon,
  FolderTree,
  Tags,
  Users,
  LogOut,
  Newspaper,
} from "lucide-react";
import { auth, signOut } from "@/lib/auth";

const STAFF_ROLES: Role[] = [Role.ADMIN, Role.EDITOR, Role.AUTHOR];

interface NavItem {
  href: string;
  label: string;
  icon: typeof FileText;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "articles",
    label: "Articles",
    icon: FileText,
    roles: [Role.ADMIN, Role.EDITOR, Role.AUTHOR],
  },
  {
    href: "media",
    label: "Media",
    icon: ImageIcon,
    roles: [Role.ADMIN, Role.EDITOR, Role.AUTHOR],
  },
  {
    href: "categories",
    label: "Categories",
    icon: FolderTree,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    href: "tags",
    label: "Tags",
    icon: Tags,
    roles: [Role.ADMIN, Role.EDITOR],
  },
  {
    href: "users",
    label: "Users",
    icon: Users,
    roles: [Role.ADMIN],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  AUTHOR: "Author",
  READER: "Reader",
};

export default async function EditorialLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);
  if (!STAFF_ROLES.includes(session.user.role)) redirect(`/${locale}`);

  const { role, name, email } = session.user;
  const nav = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="flex min-h-screen bg-zinc-100 text-zinc-900">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-e border-zinc-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-700 text-white">
            <Newspaper className="h-4 w-4" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Lower Shabelle Media</p>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">
              Editorial desk
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Editorial">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={`/${locale}/${href}`}
              className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <Icon
                className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-indigo-700"
                aria-hidden
              />
              {label}
            </Link>
          ))}
        </nav>

        {/* Session footer */}
        <div className="border-t border-zinc-200 px-5 py-4">
          <p className="truncate text-sm font-medium">{name ?? email}</p>
          <p className="text-xs text-zinc-500">{ROLE_LABEL[role]}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: `/${locale}/login` });
            }}
            className="mt-3"
          >
            <button
              type="submit"
              className="flex items-center gap-2 text-xs font-medium text-zinc-500 transition-colors hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
