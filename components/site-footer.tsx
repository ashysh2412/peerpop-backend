import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line pb-20 md:pb-0">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-muted">
        <div className="mr-auto flex items-center gap-3">
          <Logo />
          <span className="hidden sm:inline">Made for creators in India</span>
        </div>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
        <a href="mailto:hello@peerpop.in" className="hover:text-ink">
          Contact
        </a>
      </div>
    </footer>
  );
}
