"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "forgot" | "link";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "sent"; email: string; what: "link" | "reset" | "confirm" }
  | { kind: "error"; message: string };

const SUBMIT: Record<Mode, [string, string]> = {
  signin: ["Sign in", "Signing in…"],
  signup: ["Create account", "Creating…"],
  forgot: ["Email me a reset link", "Sending…"],
  link: ["Email me a code", "Sending…"],
};

/** Supabase's messages, in plainer words. */
function friendly(message: string) {
  if (/invalid login credentials/i.test(message))
    return 'Wrong email or password. If you\'ve only signed in with an email link before, tap "Forgot password?" to set one.';
  if (/already registered/i.test(message))
    return "There's already an account with this email. Sign in instead.";
  if (/email not confirmed/i.test(message))
    return "Please confirm your email first. Check your inbox for our link.";
  if (/rate limit|too many/i.test(message))
    return "Too many tries. Please wait a minute and try again.";
  return message;
}

export function LoginForm({
  next,
  initialMode = "link",
}: {
  next: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const callbackUrl = (to = next) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  function switchTo(m: Mode) {
    setMode(m);
    setStatus({ kind: "idle" });
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setStatus({ kind: "error", message: friendly(error.message) });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "busy" });
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        return setStatus({ kind: "error", message: friendly(error.message) });
      return window.location.assign(next);
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error)
        return setStatus({ kind: "error", message: friendly(error.message) });
      // With email confirmation on, there's no session until they click the link.
      if (data.session) return window.location.assign(next);
      return setStatus({ kind: "sent", email, what: "confirm" });
    }
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("/settings/password?reset=1"),
      });
      if (error)
        return setStatus({ kind: "error", message: friendly(error.message) });
      return setStatus({ kind: "sent", email, what: "reset" });
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setStatus(
      error
        ? { kind: "error", message: friendly(error.message) }
        : { kind: "sent", email, what: "link" },
    );
  }

  if (status.kind === "sent" && status.what === "link") {
    return <CodeStep email={status.email} next={next} onBack={() => switchTo("link")} />;
  }

  if (status.kind === "sent") {
    const text = {
      reset: "a link to set a new password",
      confirm: "a link to confirm your email. Tap it once and you're in",
    }[status.what as "reset" | "confirm"];
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">📬</span>
        <p className="font-semibold">Check your inbox</p>
        <p className="text-muted">
          We sent {text} to <strong className="text-ink">{status.email}</strong>
          .
        </p>
        <button
          type="button"
          onClick={() => switchTo("link")}
          className="mt-2 text-sm font-semibold text-brand hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const [label, busyLabel] = SUBMIT[mode];
  const needsPassword = mode === "signin" || mode === "signup";

  return (
    <div className="flex flex-col gap-6">
      {mode === "forgot" && (
        <p className="text-center text-sm text-muted">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      )}

      {mode !== "forgot" && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="btn-secondary h-12 w-full text-[15px]"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted uppercase">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input"
        />
        {needsPassword && (
          <>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label">
                Password
              </label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchTo("forgot")}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "signup" ? "At least 8 characters" : undefined
              }
              className="input"
            />
          </>
        )}
        <button
          type="submit"
          disabled={status.kind === "busy"}
          className="btn-primary mt-1 h-12 w-full text-[15px]"
        >
          {status.kind === "busy" ? busyLabel : label}
        </button>
        {mode === "link" ? (
          <p className="text-center text-[13px] text-muted">
            No password needed. We&apos;ll email you a code.{" "}
            <button type="button" onClick={() => switchTo("signin")} className="font-semibold text-ink hover:underline">
              Use a password
            </button>
          </p>
        ) : (
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] font-medium text-muted">
            {mode === "signin" && (
              <button type="button" onClick={() => switchTo("signup")} className="hover:text-ink">
                New here? Create a password
              </button>
            )}
            {mode === "signup" && (
              <button type="button" onClick={() => switchTo("signin")} className="hover:text-ink">
                Have a password? Sign in
              </button>
            )}
            <button type="button" onClick={() => switchTo("link")} className="hover:text-ink">
              Email me a code instead
            </button>
          </p>
        )}
      </form>

      {status.kind === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {status.message}
        </p>
      )}
    </div>
  );
}

/** After we email a code: type it here. The email also has a link, which works too. */
function CodeStep({ email, next, onBack }: { email: string; next: string; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setBusy(false);
      return setError(/expired|invalid/i.test(error.message) ? "That code didn't work. Check it, or send a new one." : friendly(error.message));
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4 text-center">
      <span className="text-4xl">📬</span>
      <div>
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-muted">
          We sent a code to <strong className="text-ink">{email}</strong>.
        </p>
      </div>
      <input
        aria-label="Code from the email"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        pattern="[0-9]{6,10}"
        maxLength={10}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        className="input h-14 text-center text-2xl font-semibold tracking-[0.4em]"
      />
      <button type="submit" disabled={busy} className="btn-primary h-12 w-full text-[15px]">
        {busy ? "Checking…" : "Continue"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="button" onClick={onBack} className="text-sm font-semibold text-muted hover:text-ink">
        Use a different email or send a new code
      </button>
    </form>
  );
}
