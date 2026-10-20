"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = { kind: "idle" } | { kind: "busy" } | { kind: "done" } | { kind: "error"; message: string };

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setStatus({ kind: "error", message: "The two passwords don't match." });
    setStatus({ kind: "busy" });
    const { error } = await createClient().auth.updateUser({ password });
    if (!error) return setStatus({ kind: "done" });
    const message = /different from the old/i.test(error.message)
      ? "That's already your password. Pick a new one."
      : /weak|at least/i.test(error.message)
        ? "Use a longer password, at least 8 characters."
        : "Couldn't save your password. Please try again.";
    setStatus({ kind: "error", message });
  }

  if (status.kind === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="text-4xl">🔒</span>
        <p className="font-semibold">Password saved</p>
        <p className="text-sm text-muted">Next time, sign in with your email and this password.</p>
        <Link href="/home" className="btn-primary btn-sm mt-1">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="password" className="label">
        New password
      </label>
      <input
        id="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
      />
      <label htmlFor="confirm" className="label mt-1">
        Type it again
      </label>
      <input
        id="confirm"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="input"
      />
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {status.message}
        </p>
      )}
      <button type="submit" disabled={status.kind === "busy"} className="btn-primary mt-2 h-11">
        {status.kind === "busy" ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
