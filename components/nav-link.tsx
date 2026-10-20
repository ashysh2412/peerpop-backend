"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Header and tab-bar link that highlights itself on its own section. */
export function NavLink({
  href,
  children,
  variant = "top",
  match,
}: {
  href: string;
  children: ReactNode;
  variant?: "top" | "tab";
  match?: string;
}) {
  const path = usePathname();
  const prefix = match ?? href;
  const active = path === prefix || path.startsWith(`${prefix}/`);
  if (variant === "tab") {
    return (
      <Link
        href={href}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand" : "text-muted"}`}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`relative inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition ${
        active ? "bg-pop-yellow text-ink ring-2 ring-ink" : "text-muted hover:bg-sunken hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
