import { unblockCreator } from "@/app/safety/actions";
import type { createClient } from "@/lib/supabase/server";
import { Avatar } from "./avatar";

type Blocked = { user_id: string; display_name: string; photo_path: string | null };

/** People you blocked, each with an Unblock button. Left out when you haven't blocked anyone. */
export async function BlockedList({ supabase }: { supabase: Awaited<ReturnType<typeof createClient>> }) {
  const { data } = await supabase.rpc("my_blocks");
  const people = (data ?? []) as Blocked[];
  if (people.length === 0) return null;
  return (
    <section id="blocked" className="card flex scroll-mt-24 flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Blocked people</h2>
        <p className="mt-1 text-sm text-muted">They can&apos;t see you, message you or send you requests. Unblocking doesn&apos;t reconnect you.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.user_id} className="flex items-center gap-3">
            <Avatar path={p.photo_path} name={p.display_name} size={36} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.display_name}</span>
            <form action={unblockCreator}>
              <input type="hidden" name="user_id" value={p.user_id} />
              <button className="btn-secondary btn-sm">Unblock</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
