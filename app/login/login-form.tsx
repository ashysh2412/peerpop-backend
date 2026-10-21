"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "password": the usual email + password. "code": new people and forgotten passwords get a code by email,
// then pick a password so next time it's just email + password.
type Step = { name: "password" } | { name: "email"; reason: "join" | "forgot" } | { name: "code"; email: string; reason: "join" | "forgot" } | { name: "new-password"; reason: "join" | "forgot" };

/** Supabase's messages, in plainer words. */
function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password. Tap "Forgot password?" to get a code instead.';
  if (/rate limit|too many|seconds/i.test(message)) return "Too many tries. Please wait a minute and try again.";
  if (/expired|invalid|token/i.test(message)) return "That code didn't work. Check it, or send a new one.";
  if (/different from the old/i.test(message)) return "That's already your password. Pick a new one, or skip.";
  if (/weak|at least|short/i.test(message)) return "Use a longer password, at least 8 characters.";
  return "Something went wrong. Please try again.";
}

function GoogleButton({ next, onError }: { next: string; onError: (m: string) => void }) {
  async function go() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) onError(friendly(error.message));
  }
  return (
    <button type="button" onClick={go} className="btn-secondary h-12 w-full text-[15px]">
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
  );
}

function PasswordInput({ value, onChange, isNew }: { value: string; onChange: (v: string) => void; isNew?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id="password"
        type={show ? "text" : "password"}
        required
        minLength={isNew ? 8 : undefined}
        autoComplete={isNew ? "new-password" : "current-password"}
        placeholder={isNew ? "At least 8 characters" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input pr-12"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const linkButton = "font-semibold text-brand hover:underline";

export function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<Step>({ name: "password" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go(s: Step) {
    setStep(s);
    setError(null);
    setBusy(false);
  }

  async function run(work: () => Promise<string | null | void>) {
    setBusy(true);
    setError(null);
    const message = await work();
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) return friendly(error.message);
      window.location.assign(next);
    });
  };

  const sendCode = (reason: "join" | "forgot") => (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: reason === "join" } });
      // Someone who tapped "Forgot password?" without an account just gets a code to join instead.
      if (error && reason === "forgot" && /signups not allowed|not found/i.test(error.message)) {
        const retry = await createClient().auth.signInWithOtp({ email });
        if (retry.error) return friendly(retry.error.message);
      } else if (error) return friendly(error.message);
      setCode("");
      go({ name: "code", email, reason });
    });
  };

  const verify = (reason: "join" | "forgot") => (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await createClient().auth.verifyOtp({ email, token: code, type: "email" });
      if (error) return friendly(error.message);
      setPassword("");
      go({ name: "new-password", reason });
    });
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) return friendly(error.message);
      window.location.assign(next);
    });
  };

  const emailInput = (
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
  );
  const submit = (label: string, busyLabel: string) => (
    <button type="submit" disabled={busy} className="btn-primary mt-1 h-12 w-full text-[15px]">
      {busy ? busyLabel : label}
    </button>
  );
  const errorLine = error && (
    <p role="alert" className="text-center text-sm text-red-600">
      {error}
    </p>
  );

  if (step.name === "new-password") {
    return (
      <form onSubmit={savePassword} className="flex flex-col gap-3">
        <div className="text-center">
          <p className="text-lg font-semibold">{step.reason === "forgot" ? "Pick a new password" : "Create a password"}</p>
          <p className="mt-1 text-sm text-muted">Next time, just log in with your email and this password.</p>
        </div>
        <label htmlFor="password" className="label mt-2">
          Password
        </label>
        <PasswordInput value={password} onChange={setPassword} isNew />
        {submit("Save and continue", "Saving…")}
        {errorLine}
        <button type="button" onClick={() => window.location.assign(next)} className="text-sm font-medium text-muted hover:text-ink">
          Skip for now
        </button>
      </form>
    );
  }

  if (step.name === "code") {
    return (
      <form onSubmit={verify(step.reason)} className="flex flex-col gap-4 text-center">
        <span className="text-4xl">📬</span>
        <div>
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-muted">
            We sent a code to <strong className="text-ink">{step.email}</strong>.
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
        {submit("Continue", "Checking…")}
        {errorLine}
        <button type="button" onClick={() => go({ name: "email", reason: step.reason })} className="text-sm font-semibold text-muted hover:text-ink">
          Use a different email or send a new code
        </button>
      </form>
    );
  }

  if (step.name === "email") {
    return (
      <form onSubmit={sendCode(step.reason)} className="flex flex-col gap-3">
        <div className="text-center">
          <p className="text-lg font-semibold">{step.reason === "forgot" ? "Forgot your password?" : "Join Peerpop"}</p>
          <p className="mt-1 text-sm text-muted">
            {step.reason === "forgot" ? "We'll email you a code, then you can pick a new password." : "We'll email you a code. No password needed yet."}
          </p>
        </div>
        <label htmlFor="email" className="label mt-2">
          Email
        </label>
        {emailInput}
        {submit("Email me a code", "Sending…")}
        {errorLine}
        <button type="button" onClick={() => go({ name: "password" })} className="text-sm font-medium text-muted hover:text-ink">
          Back to log in
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next} onError={setError} />
      <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted uppercase">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={signIn} className="flex flex-col gap-3">
        <label htmlFor="email" className="label">
          Email
        </label>
        {emailInput}
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">
            Password
          </label>
          <button type="button" onClick={() => go({ name: "email", reason: "forgot" })} className={`text-sm ${linkButton}`}>
            Forgot password?
          </button>
        </div>
        <PasswordInput value={password} onChange={setPassword} />
        {submit("Log in", "Logging in…")}
        {errorLine}
      </form>
      <p className="text-center text-sm text-muted">
        New to Peerpop?{" "}
        <button type="button" onClick={() => go({ name: "email", reason: "join" })} className={linkButton}>
          Join with your email
        </button>
      </p>
    </div>
  );
}
