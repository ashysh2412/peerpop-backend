import { Plus, Search } from "lucide-react";
import Link from "next/link";
import type { Suggestion } from "@/lib/feed/data";
import { Avatar } from "./avatar";

type Me = { handle: string; display_name: string; photo_path: string | null };

function Bubble({ href, label, children, ring = true }: { href: string; label: string; children: React.ReactNode; ring?: boolean }) {
  return (
    <Link href={href} className="group flex w-[76px] shrink-0 snap-start flex-col items-center gap-1.5 text-center">
      <span className={`rounded-full p-[3px] transition group-hover:scale-105 ${ring ? "bg-brand-gradient" : "bg-line"}`}>
        <span className="block rounded-full bg-surface p-[2px]">{children}</span>
      </span>
      <span className="w-full truncate text-xs font-medium">{label}</span>
    </Link>
  );
}

/** A swipeable row of creators to meet, like stories on Instagram. */
export function CreatorStories({ me, people }: { me: Me; people: Suggestion[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <Bubble href={`/creators/${me.handle}`} label="You" ring={false}>
        <span className="relative block">
          <Avatar path={me.photo_path} name={me.display_name} size={62} />
          <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white ring-2 ring-surface">
            <Plus size={13} strokeWidth={3} />
          </span>
        </span>
      </Bubble>
      {people.map((p) => (
        <Bubble key={p.user_id} href={`/creators/${p.handle}`} label={p.display_name.split(" ")[0]}>
          <Avatar path={p.photo_path} name={p.display_name} size={62} />
        </Bubble>
      ))}
      <Bubble href="/creators" label="Find more" ring={false}>
        <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-sunken text-muted">
          <Search size={22} />
        </span>
      </Bubble>
    </div>
  );
}
