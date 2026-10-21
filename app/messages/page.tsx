import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Suspense } from "react";
import { InboxList } from "@/components/inbox-list";
import { CardsSkeleton } from "@/components/skeleton";
import { getInbox } from "@/lib/messages/data";
import { requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Messages · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function MessagesPage() {
  return (
    <main className="page">
      <Suspense fallback={<CardsSkeleton />}>
        <Inbox />
      </Suspense>
    </main>
  );
}

async function Inbox() {
  const { supabase } = await requireUser("/messages");
  const chats = await getInbox(supabase);
  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="flex flex-col gap-3">
        <h1 className="page-title">Messages</h1>
        <InboxList chats={chats} now={currentTime()} />
      </section>
      <div className="card hidden flex-col items-center justify-center gap-2 p-10 text-center text-muted lg:flex">
        <MessageCircle size={32} className="text-brand" />
        <p>Pick a chat to read it here.</p>
      </div>
    </div>
  );
}
