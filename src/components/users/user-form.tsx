"use client";

/**
 * UserForm — shared create/edit form.
 *
 * mode="create" wires to createUser; mode="edit" wires to updateUser
 * and pre-fills from `user`. Field-level errors come back from the
 * server action via useActionState. Password is required on create,
 * optional on edit (blank = keep existing).
 *
 * Creamy-wood tokens; readable in both light and dark because it uses
 * bg-surface / bg-canvas / text-ink tokens (which flip via CSS vars).
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, UserPlus } from "lucide-react";
import { Role } from "@prisma/client";
import {
  createUser,
  updateUser,
  type ActionState,
} from "@/server/actions/users";

const initial: ActionState = { ok: false };

const FIELD =
  "w-full rounded-xl bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:outline-none focus:ring-4 focus:ring-sage-soft";
const LABEL = "block text-xs font-semibold text-ink-soft";
const ERR = "mt-1 text-xs text-terracotta";

const ROLES: Role[] = [Role.ADMIN, Role.EDITOR, Role.AUTHOR, Role.READER];

interface UserFormProps {
  mode: "create" | "edit";
  locale: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    isActive: boolean;
  };
}

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-hover disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : mode === "create" ? (
        <UserPlus className="h-4 w-4" aria-hidden />
      ) : (
        <Save className="h-4 w-4" aria-hidden />
      )}
      {mode === "create" ? "Create user" : "Save changes"}
    </button>
  );
}

export function UserForm({ mode, locale, user }: UserFormProps) {
  const action = mode === "create" ? createUser : updateUser;
  const [state, formAction] = useActionState(action, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5 rounded-3xl bg-surface p-6 shadow-soft sm:p-8">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && user && (
        <input type="hidden" name="id" value={user.id} />
      )}

      {state.error && (
        <p className="rounded-xl bg-terracotta-soft px-4 py-3 text-sm text-terracotta">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL}>Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user?.name ?? ""}
            placeholder="Full name"
            className={`${FIELD} mt-1.5`}
          />
          {fe.name && <p className={ERR}>{fe.name[0]}</p>}
        </div>

        <div>
          <label htmlFor="email" className={LABEL}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            placeholder="name@newsroom.com"
            className={`${FIELD} mt-1.5`}
          />
          {fe.email && <p className={ERR}>{fe.email[0]}</p>}
        </div>

        <div>
          <label htmlFor="role" className={LABEL}>Role</label>
          <select
            id="role"
            name="role"
            defaultValue={user?.role ?? Role.AUTHOR}
            className={`${FIELD} mt-1.5`}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          {fe.role && <p className={ERR}>{fe.role[0]}</p>}
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>
            {mode === "create" ? "Password" : "New password (optional)"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder={mode === "create" ? "At least 8 characters" : "Leave blank to keep current"}
            className={`${FIELD} mt-1.5`}
          />
          {fe.password && <p className={ERR}>{fe.password[0]}</p>}
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={user?.isActive ?? true}
          className="h-4 w-4 rounded border-ring text-sage focus:ring-sage-soft"
        />
        <span className="text-sm text-ink-soft">
          Active (can sign in and appear as an author)
        </span>
      </label>

      <div className="pt-2">
        <Submit mode={mode} />
      </div>
    </form>
  );
};