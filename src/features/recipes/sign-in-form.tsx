"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/auth/browser";

export function SignInForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const { error } = await getBrowserSupabaseClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setMessage("Access denied. Check your credentials or contact the vault owner.");
      setPending(false);
      return;
    }
    router.replace("/recipes");
    router.refresh();
  }
  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Recipe Vault</h1>
      <p>Sign in to access your private recipe collection.</p>
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
      <button className="primary-button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
