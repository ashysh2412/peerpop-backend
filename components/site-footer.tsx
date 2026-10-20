import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl gap-4 px-4 py-6 text-sm text-zinc-500">
        <span className="mr-auto">© Peerpop</span>
        <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Terms
        </Link>
        <a href="mailto:hello@peerpop.in" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Contact
        </a>
      </div>
    </footer>
  );
}
