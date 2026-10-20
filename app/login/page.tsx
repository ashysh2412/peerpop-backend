import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Peerpop" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_0%,var(--glow-1),transparent)]" />
      <div className="card flex w-full max-w-md flex-col gap-7 p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome to Peerpop</h1>
          <p className="mt-2 text-muted">Sign in or create your free account.</p>
        </div>
        <Suspense>
          <LoginBody searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginBody({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);

  return (
    <>
      {params.error === "link" && (
        <p role="alert" className="text-center text-sm text-red-600">
          That sign-in link has expired or was already used. Try again.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}
