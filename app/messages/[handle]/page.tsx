import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatThread } from "@/components/chat-thread";
import { InboxList } from "@/components/inbox-list";
import { CardsSkeleton } from "@/components/skeleton";
import { getConnection } from "@/lib/connections/data";
import { getInbox, getThread } from "@/lib/messages/data";
import { getProfileByHandle, requireUser } from "@/lib/profile/data";

export const metadata: Metadata = { title: "Messages · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function ChatPage({ params }: PageProps<"/messages/[handle]">) {
  return (
    <main className="page py-4 sm:py-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Chat params={params} />
      </Suspense>
    </main>
  );
}

async function Chat({ params }: Pick<PageProps<"/messages/[handle]">, "params">) {
  const { handle } = await params;
  const { supabase, user } = await requireUser(`/messages/${handle}`);
  const other = await getProfileByHandle(supabase, decodeURIComponent(handle));
  if (!other) notFound();
  if (other.user_id === user.id) redirect("/messages");

  // Opening the chat reads everything they sent.
  await supabase.rpc("mark_messages_read", { other: other.user_id });
  const [connection, thread, chats] = await Promise.all([
    getConnection(supabase, user.id, other.user_id),
    getThread(supabase, user.id, other.user_id),
    getInbox(supabase),
  ]);

  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="hidden flex-col gap-3 lg:flex">
        <h1 className="page-title">Messages</h1>
        <InboxList chats={chats} active={other.handle} now={currentTime()} />
      </section>
      <ChatThread
        key={other.user_id}
        me={user.id}
        other={{ id: other.user_id, handle: other.handle, name: other.display_name, photo: other.photo_path }}
        initial={thread}
        canSend={connection?.status === "accepted"}
      />
    </div>
  );
}
