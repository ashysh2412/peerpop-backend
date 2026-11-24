import Link from "next/link";
import { acceptConnection } from "@/app/network/actions";
import type { getWaitingRequests } from "@/lib/connections/data";
import { Avatar } from "./avatar";

type Waiting = Awaited<ReturnType<typeof getWaitingRequests>>;

/**
 * "Neha wants to connect" at the top of Home, with one-tap Accept, so requests don't sit
 * unanswered. Decline stays on the Network page. Renders nothing when nobody is waiting.
 */
export function WaitingRequests({ total, requests }: Waiting) {
  if (requests.length === 0) return null;
  const first = requests[0].profile.display_name.split(" ")[0];
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          {total === 1 ? `${first} wants to connect` : `${total} creators want to connect`}
        </h2>
        <Link href="/network?tab=received" className="shrink-0 text-xs font-semibold text-brand-ink hover:underline">
          See all
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <Link href={`/creators/${r.profile.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar path={r.profile.photo_path} name={r.profile.display_name} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold hover:underline">{r.profile.display_name}</span>
                <span className="block truncate text-xs text-muted">{r.message ? `“${r.message}”` : "Wants to connect with you"}</span>
              </span>
            </Link>
            <form action={acceptConnection} className="shrink-0">
              <input type="hidden" name="id" value={r.id} />
              <button className="btn-primary btn-sm">Accept</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
