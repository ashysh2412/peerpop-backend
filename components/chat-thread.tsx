"use client";

import { ArrowLeft, Flag, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markRead, sendMessage } from "@/app/messages/actions";
import type { Message } from "@/lib/messages/data";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";

// Always Indian time, so the server and the browser print the same thing.
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

type Other = { id: string; handle: string; name: string; photo: string | null };

/** One conversation. New messages from the other person arrive live. */
export function ChatThread({ me, other, initial, canSend }: { me: string; other: Other; initial: Message[]; canSend: boolean }) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${me}-${other.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` }, (payload) => {
        const m = payload.new as Message;
        if (m.sender_id !== other.id) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        void markRead(other.id);
      })
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
    if (result.error || !result.message) return setError(result.error ?? "Couldn't send. Please try again.");
    setText("");
    setMessages((prev) => [...prev, result.message!]);
  }

  return (
    <section className="card flex h-[calc(100dvh-210px)] min-h-[420px] flex-col overflow-hidden md:h-[calc(100dvh-150px)]">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/messages" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-sunken lg:hidden" aria-label="Back to messages">
          <ArrowLeft size={20} />
        </Link>
        <Link href={`/creators/${other.handle}`} className="flex min-w-0 items-center gap-3 hover:underline">
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
        {messages.length === 0 && <p className="m-auto max-w-xs text-center text-sm text-muted">Say hello to {other.name.split(" ")[0]} 👋</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const day = dayFormat.format(new Date(m.created_at));
          const newDay = i === 0 || dayFormat.format(new Date(messages[i - 1].created_at)) !== day;
          return (
            <div key={m.id} className="flex flex-col">
              {newDay && <p className="my-2 self-center rounded-full bg-sunken px-3 py-1 text-xs font-medium text-muted">{day}</p>}
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap ${
                  mine ? "bg-brand-gradient self-end rounded-br-md text-ink" : "self-start rounded-bl-md bg-sunken text-ink"
                }`}
              >
                {m.body}
                <span className={`ml-2 inline-block text-[11px] ${mine ? "text-ink/60" : "text-muted"}`}>{timeFormat.format(new Date(m.created_at))}</span>
              </div>
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
          <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="btn-primary h-11 w-11 shrink-0 p-0">
            <SendHorizontal size={18} />
          </button>
        </form>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-muted">You can message {other.name.split(" ")[0]} once you&apos;re connected.</p>
      )}
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
