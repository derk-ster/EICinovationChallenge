"use client";

import { useActionState } from "react";
import { signInAction, type ActionState } from "@/app/officers/actions";
import { inputBase, Spinner } from "@/components/submit/fields";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signInAction, null);
  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="email" className="font-semibold">
          Officer email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={`${inputBase} mt-2`} />
      </div>
      <div>
        <label htmlFor="password" className="font-semibold">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={`${inputBase} mt-2`} />
      </div>
      {state && !state.ok && (
        <p role="alert" className="border-l-4 border-danger bg-danger/[0.06] p-4 t-small font-medium">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center gap-2 bg-ink px-6 font-semibold text-paper hover:bg-forest disabled:opacity-60">
        {pending && <Spinner />}
        Sign in
      </button>
    </form>
  );
}
