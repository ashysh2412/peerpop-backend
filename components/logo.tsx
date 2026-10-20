import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Peerpop home">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-lg leading-none font-extrabold text-white shadow-[0_6px_14px_-6px_var(--brand)]">
        p
      </span>
      <span className="text-lg font-extrabold tracking-tight">peerpop</span>
    </Link>
  );
}
