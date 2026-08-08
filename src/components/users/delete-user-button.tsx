"use client";

/**
 * DeleteUserButton — two-step delete with pending state.
 *
 * First click arms (shows "Confirm?"), second click fires the
 * deleteUser server action. Uses useActionState for the result and
 * useTransition-style pending via the form status. Auto-disarms after
 * a few seconds if not confirmed.
 *
 * The server action enforces all safety rules; this is just UX.
 */
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteUser, type ActionState } from "@/server/actions/users";

const initial: ActionState = { ok: false };

function SubmitButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
        armed
          ? "bg-terracotta text-white hover:opacity-90"
          : "bg-canvas text-ink-muted hover:bg-wood hover:text-ink"
      }`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : armed ? (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      {armed ? "Confirm?" : "Delete"}
    </button>
  );
}

export function DeleteUserButton({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const [state, formAction] = useActionState(deleteUser, initial);
  const [armed, setArmed] = useState(false);

  // Auto-disarm after 4s.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!armed) {
            e.preventDefault();
            setArmed(true);
          }
        }}
      >
        <input type="hidden" name="id" value={userId} />
        <input type="hidden" name="locale" value={locale} />
        <SubmitButton armed={armed} />
      </form>
      {state.error && (
        <p className="max-w-[16rem] text-end text-[11px] text-terracotta">
          {state.error}
        </p>
      )}
    </div>
  );
}
