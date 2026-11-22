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
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: "top" | "tab";
  match?: string;
  /** Tab bar only: the icon above the label (with any count badge). */
  icon?: ReactNode;
}) {
  const path = usePathname();
  const prefix = match ?? href;
  const active = path === prefix || path.startsWith(`${prefix}/`);
  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[11px] leading-none ${active ? "font-semibold text-ink" : "font-medium text-muted"}`}
      >
        {/* The active tab gets a yellow pill behind its icon, in the header's colour. */}
        <span
          className={`relative flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-brand/30" : ""}`}
        >
          {icon}
        </span>
        <span className="max-w-full truncate px-0.5">{children}</span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`relative inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition ${
        active
          ? "bg-black/10 text-ink"
          : "text-ink/75 hover:bg-black/10 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
