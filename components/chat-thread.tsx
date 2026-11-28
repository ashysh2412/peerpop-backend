"use client";

import { ArrowLeft, Ban, Flag, SendHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteMessage, markRead, sendMessage } from "@/app/messages/actions";
import type { Message } from "@/lib/messages/data";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";
import { LinkedText } from "./linked-text";

// Always Indian time, so the server and the browser print the same thing.
const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const dayFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** A sender can delete their own message for everyone within this long (the database checks it too). */
const DELETE_WINDOW_MS = 60 * 60 * 1000;
function stillDeletable(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() <= DELETE_WINDOW_MS;
}

type Other = { id: string; handle: string; name: string; photo: string | null };

/** One conversation. New messages from the other person arrive live. */
export function ChatThread({
  me,
  other,
  initial,
  canSend,
}: {
  me: string;
  other: Other;
  initial: Message[];
  canSend: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The message whose "Delete for everyone" option is open.
  const [picked, setPicked] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${me}-${other.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${me}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (m.sender_id !== other.id) return;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
          void markRead(other.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${me}`,
        },
        (payload) => {
          // They deleted a message for everyone.
          const m = payload.new as Message;
          if (m.sender_id !== other.id || !m.deleted_at) return;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, other.id]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const result = await sendMessage(other.id, body);
    setSending(false);
    if (result.error || !result.message)
      return setError(result.error ?? "Couldn't send. Please try again.");
    setText("");
    setMessages((prev) => [...prev, result.message!]);
  }

  function pick(m: Message) {
    if (m.sender_id !== me || m.deleted_at) return;
    if (picked === m.id) return setPicked(null);
    setError(null);
    if (!stillDeletable(m.created_at))
      return setError("Messages can only be deleted within 1 hour of sending.");
    setPicked(m.id);
  }

  async function remove(id: string) {
    if (deleting) return;
    setDeleting(true);
    const result = await deleteMessage(id);
    setDeleting(false);
    setPicked(null);
    if (result.error) return setError(result.error);
    setMessages((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, body: "This message was deleted", deleted_at: new Date().toISOString() }
          : x,
      ),
    );
  }

  return (
    <section className="card flex h-[calc(100dvh-210px-env(safe-area-inset-bottom))] min-h-[420px] flex-col overflow-hidden md:h-[calc(100dvh-150px)]">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link
          href="/messages"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-sunken lg:hidden"
          aria-label="Back to messages"
        >
          <ArrowLeft size={20} />
        </Link>
        <Link
          href={`/creators/${other.handle}`}
          className="flex min-w-0 items-center gap-3 hover:underline"
        >
          <Avatar path={other.photo} name={other.name} size={40} />
          <span className="truncate font-semibold">{other.name}</span>
        </Link>
        <Link
          href={`/creators/${other.handle}/report`}
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-ink"
          aria-label={`Report or block ${other.name}`}
          title="Report or block"
        >
          <Flag size={17} />
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-muted">
            Say hello to {other.name.split(" ")[0]} 👋
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const day = dayFormat.format(new Date(m.created_at));
          const newDay =
            i === 0 ||
            dayFormat.format(new Date(messages[i - 1].created_at)) !== day;
          return (
            <div key={m.id} className="flex flex-col">
              {newDay && (
                <p className="my-2 self-center rounded-full bg-sunken px-3 py-1 text-xs font-medium text-muted">
                  {day}
                </p>
              )}
              {m.deleted_at ? (
                <div
                  className={`flex max-w-[80%] items-center gap-1.5 rounded-3xl border border-line px-4 py-2 text-[14px] text-muted italic ${
                    mine ? "self-end rounded-br-md" : "self-start rounded-bl-md"
                  }`}
                >
                  <Ban size={14} aria-hidden />
                  {mine ? "You deleted this message" : "This message was deleted"}
                  <span className="ml-1 text-[11px] whitespace-nowrap not-italic">
                    {timeFormat.format(new Date(m.created_at))}
                  </span>
                </div>
              ) : (
                <div
                  onClick={mine ? () => pick(m) : undefined}
                  title={mine ? "Tap to delete" : undefined}
                  className={`max-w-[80%] rounded-3xl px-4 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap ${
                    mine
                      ? `bg-brand-gradient self-end rounded-br-md text-ink cursor-pointer ${picked === m.id ? "ring-2 ring-ink/70" : ""}`
                      : "self-start rounded-bl-md bg-sunken text-ink"
                  }`}
                >
                  <LinkedText text={m.body} />
                  <span
                    className={`ml-2 inline-block text-[11px] ${mine ? "text-ink/60" : "text-muted"}`}
                  >
                    {timeFormat.format(new Date(m.created_at))}
                  </span>
                </div>
              )}
              {picked === m.id && (
                <div className="mt-1 flex items-center gap-2 self-end">
                  <button
                    type="button"
                    onClick={() => setPicked(null)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-sunken"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(m.id)}
                    disabled={deleting}
                    className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <Trash2 size={13} aria-hidden />
                    {deleting ? "Deleting…" : "Delete for everyone"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2 border-t border-line p-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Write a message"
            aria-label="Message"
            className="input max-h-32 min-h-11 flex-1 resize-none py-2.5"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Send"
            className="btn-primary h-11 w-11 shrink-0 p-0"
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-muted">
          You can message {other.name.split(" ")[0]} once you&apos;re connected.
        </p>
      )}
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
