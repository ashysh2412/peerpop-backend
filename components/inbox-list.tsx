import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { Chat } from "@/lib/messages/data";
import { Avatar } from "./avatar";
import { updatedLabel } from "./youtube-stats";

/** The list of chats, newest first. `active` is the handle of the open chat. */
export function InboxList({ chats, active, now }: { chats: Chat[]; active?: string; now: number }) {
  if (chats.length === 0) {
    return (
      <div className="empty">
        <MessageCircle size={32} className="text-brand-ink" />
        <p className="font-semibold text-ink">No messages yet</p>
        <p className="max-w-xs text-sm">
          Open one of your{" "}
          <Link href="/network" className="font-semibold text-brand-ink hover:underline">
            connections
          </Link>{" "}
          and tap Message to start a chat.
        </p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col">
      {chats.map((c) => (
        <li key={c.other_id}>
          <Link
            href={`/messages/${c.handle}`}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${c.handle === active ? "bg-brand-soft" : "hover:bg-sunken"}`}
          >
            <Avatar path={c.photo_path} name={c.display_name} size={48} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.display_name}</span>
                <span className="shrink-0 text-xs text-muted">{updatedLabel(c.last_at, now)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`flex-1 truncate text-sm ${c.unread ? "font-semibold text-ink" : "text-muted"}`}>
                  {c.last_from_me && "You: "}
                  {c.last_body}
                </span>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-ink">{c.unread}</span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
