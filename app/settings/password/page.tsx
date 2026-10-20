import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/profile/data";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Password · Peerpop" };

export default function PasswordPage({ searchParams }: PageProps<"/settings/password">) {
  return (
    <main className="page-narrow flex flex-col gap-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/settings/password">, "searchParams">) {
  const { user } = await requireUser("/settings/password");
  const { reset } = await searchParams;
  return (
    <>
      <div>
        <Link href="/settings/profile" className="text-sm font-medium text-muted hover:text-ink">
          ← Edit profile
        </Link>
        <h1 className="page-title mt-2">{reset ? "Set a new password" : "Change password"}</h1>
        <p className="mt-1 text-muted">
          For <strong className="text-ink">{user.email}</strong>. After this you can sign in with your email and password.
        </p>
      </div>
      <section className="card p-5 sm:p-6">
        <PasswordForm />
      </section>
    </>
  );
}
