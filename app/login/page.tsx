import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Peerpop" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in to Peerpop</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          New here? Signing in creates your account.
        </p>
      </div>
      <Suspense>
        <LoginBody searchParams={searchParams} />
      </Suspense>
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
