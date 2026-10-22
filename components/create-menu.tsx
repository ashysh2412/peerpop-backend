"use client";

import { Handshake, LayoutGrid, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dropdown } from "./dropdown";

const item = "flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium hover:bg-sunken";

/** The big middle button of the phone tab bar: start a post, a collab or a group. */
export function CreateMenu() {
  const path = usePathname();
  return (
    <Dropdown
      className="relative flex flex-1 justify-center"
      summaryClassName="-mt-5 flex h-14 w-14 cursor-pointer list-none items-center justify-center rounded-full bg-brand text-ink shadow-lg ring-4 ring-card transition active:scale-95 [&::-webkit-details-marker]:hidden"
      summary={
        <>
          <Plus size={28} strokeWidth={2.5} />
          <span className="sr-only">Create</span>
        </>
      }
    >
      <div className="card fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 p-1.5 shadow-2xl">
        <Link
          href="/home#compose"
          className={item}
          onClick={(e) => {
            // Already on Home: the hash may not change, so jump to the box directly.
            const box = path === "/home" ? document.querySelector<HTMLTextAreaElement>("#compose textarea") : null;
            if (box) {
              e.preventDefault();
              box.scrollIntoView({ block: "center" });
              box.focus();
            }
          }}
        >
          <PenLine size={20} className="text-brand-ink" /> Post an update
        </Link>
        <Link href="/collabs/new" className={item}>
          <Handshake size={20} className="text-brand-ink" /> Start a collab
        </Link>
        <Link href="/groups/new" className={item}>
          <LayoutGrid size={20} className="text-brand-ink" /> Create a group
        </Link>
      </div>
    </Dropdown>
  );
}
